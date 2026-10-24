// Runner plan, Chapter 5b (docs/RUNNER.md): the Chocobo Farm, the Midgar Zolom marsh, the Mythril Mine,
// Yuffie in the forests, Fort Condor (the three Disc 1 battles), Junon (Priscilla, Bottomswell, the
// night, the parade, upper Junon, the send-off) and the cargo ship (Jenova-BIRTH). Handoff: the ship
// docks at Costa del Sol (c5b_arrived; s.goto('costa_port', 'from_ship')).
//
// Items (Walkthrough {10}-{12}, Item/Materia Locations): Choco/Mog (the chocobo dance), Chocobo Lure
// (Choco Billy, 2000 gil), Gysahl Greens x2, Long Range, Ether, Mind Source, Tent, Elixir, Hi-Potion
// (Mythril Mine), Magic Comb / Peace Ring / Ether x3 (Fort Condor battles 1-3), Throw (Yuffie), Shiva
// (Priscilla), Power Wrist (Bottomswell), 5000 gil (the parade, 50%+), Enemy Skill, 1/35 soldier x2,
// Mind / Luck / Power / Guard / Speed Source (Junon), Force Stealer (the send-off, 100+ points), Ether,
// All, Wind Slash, White Cape (Jenova-BIRTH), Ifrit.
// Steals: Grand Glove (Madouge, Mythril Mine) for Tifa; Boomerang (Formula, Junon forests) for Yuffie.
// Enemy Skill: Flame Thrower (Ark Dragon, Mythril Mine).
// Choices: the marsh is crossed as in FF7, on a wild chocobo caught with the Chocobo Lure and a Gysahl Green
// (catchChocobo; Choco Billy's 500-gil rental is this game's other way); the Walkthrough's order for Fort
// Condor (battle 1 on the first visit, battle 2 right after the night in Junon, battle 3 from the water with
// the whistle, all won with the minigame bot, which wants ~4500 gil on hand); the fort before Yuffie, so her
// hunt can rest in its free beds; Yuffie found in the Condor Area's little wood (same 32/256 odds, none of
// the Junon woods' packs of five Capparwires) and answered
// as the Walkthrough says ("Not interested", "...petrified", "Wait a second!", "...That's right",
// "...Let's hurry on"); the random fights on the walks through the Junon / Mythril woods are run from, and
// Cloud runs from all of them while he is alone (the night in Junon to the ship's alarm); Aeris "You look
// great", Tifa "I'm fine" on the ship (date points). Levels: the farm's grass to an average of 16 (and the
// Lure's gil), the Condor grass to 19 after the fort's first battle.
(function () {
  const R = FF7.runner, O = R.ops, C5 = R.c5 = R.c5 || {};

  // ['c5a_train', level, gil, { world, terrain, region, restMap, restNpc, restChoose }]: rounds of a few fights on
  // the world map near tile `world` (on those terrain codes / that region), a rest (restNpc's bed on restMap,
  // answering restChoose) when the party is worn down, until the party's average level and the gil reach the
  // marks (or 14 rounds)
  const tired = () => FF7.sys.party.active().some(c => c.hp <= 0 || c.hp < c.maxHp * 0.45 || c.mp < c.maxMp * 0.25);
  O.c5a_train = function* (lv, gil, o = {}) {
    const ok = () => R.avgLevel() >= lv && FF7.state.gil >= gil;
    const rest = () => restAt(o);
    for (let round = 0; round < 14 && !ok(); round++) {
      if (tired() && FF7.state.gil >= 100) { const r = yield* rest(); if (r !== true) R.note('train: rest: ' + r); }
      if (ok()) break;
      if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return 'train: ' + g; yield* R.settle(3); }
      yield* O.c5a_grind(() => ok() || tired(), { world: o.world, terrain: o.terrain, region: o.region, maxBattles: 6, soft: true, heal: 0.5 });
    }
    if (!ok()) R.note('train: average level ' + R.avgLevel().toFixed(1) + ', ' + FF7.state.gil + ' gil');
    if (tired()) yield* rest();
    return true;
  };

  // Fort Condor wants 4000 gil on hand before a battle, and the minigame bot hires with what there is (it
  // wins reliably from about 4500, spending some 3000): when the fights on the way didn't bring enough,
  // a few Ethers go to the fort's item shop (750 gil each, as the Walkthrough suggests), keeping two
  O.c5b_fund = function* (target) {
    const st = FF7.state; if (st.gil >= target) return true;
    const n = Math.min(FF7.sys.inv.count('ether') - 2, Math.ceil((target - st.gil) / 750));
    if (n <= 0) return 'fund: ' + st.gil + ' gil, and nothing to sell';
    if (R.where() !== 'condor_hall') { const g = yield* R.gotoMap('condor_hall'); if (g !== true && g !== 'mapchanged') return 'fund: ' + g; }
    return yield* O.c5a_shop(24, 7, { sell: [['ether', n]], lenient: true });
  };

  // Yuffie in the forests: walk the forest tiles near (x, y) (of `region`) until the Mystery Ninja shows up
  // and is beaten
  O.c5b_ninja = function* (x, y, o = {}) {
    const found = () => FF7.state.flags.yuffie_joined || FF7.state.flags.c12a_ninja_active || R.where() === 'side_ninja_clearing';
    if (found()) return true;
    const keep = R.battleOpts;
    for (let round = 0; round < (o.rounds || 14) && !found(); round++) {
      if (o.restMap && tiredOf(0.6)) { const r = yield* restAt(o); if (r !== true) R.note('ninja: rest: ' + r); }
      if (found()) break;
      if (R.where() !== 'world' || !o.spots.some(p => { const ws = R.worldScene(); return ws && Math.floor(ws.px) === p[0] && Math.floor(ws.pz) === p[1]; })) {
        const w = yield* O.c5a_worldTo(x, y, { flee: true }); if (w !== true && !found()) R.note('ninja: ' + w);
      }
      if (found()) break;
      R.battleOpts = Object.assign({}, keep, { flee: false });
      yield* O.c5a_grind(() => found() || tiredOf(0.6), { world: [x, y], terrain: 'fj', region: o.region, spots: o.spots, stopMap: true, maxBattles: 8, soft: true, noBattle: 40000, heal: 0.8 });
      R.battleOpts = keep;
    }
    R.battleOpts = keep;
    if (!found()) R.note('ninja: no Mystery Ninja');
    return true;
  };
  // ['c5b_solo', map]: Cloud alone from Junon to Fort Condor or back (running from the fights, patched up after
  // each one: two packs of Capparwires in a row can finish him), then into the map
  O.c5b_solo = function* (map, o = {}) {
    if (R.where() === map) return true;
    const L = FF7.world.location(o.loc || (map.startsWith('condor') ? 'fort_condor' : 'junon'));
    const near = L.id === 'junon' ? [L.x + 2, L.y + 1] : [L.x - 2, L.y - 1];      // forest by Junon's gate, the grass below the fort
    const w = yield* O.c5a_worldTo(near[0], near[1], { flee: true, heal: 0.7 });
    if (w !== true) R.note('solo: ' + w);
    yield* O.heal({ below: 0.7 });
    const keep = R.battleOpts;
    R.battleOpts = Object.assign({}, keep, { flee: true });
    let g;
    try { g = yield* C5.passBy(() => R.gotoMap(map)); } finally { R.battleOpts = keep; }
    return g === true || g === 'mapchanged' || R.where() === map ? true : 'solo: ' + g;
  };
  // worn down (someone KO'd or below `f` of their HP, or low on MP); a night in restNpc's bed on restMap
  const tiredOf = (f) => FF7.sys.party.active().some(c => c.hp <= 0 || c.hp < c.maxHp * f || c.mp < c.maxMp * 0.25);
  const restAt = function* (o) {
    if (R.where() !== o.restMap) {
      const keep = R.battleOpts;
      R.battleOpts = Object.assign({}, keep, { flee: true });             // worn down: run from the fights on the way
      let g = true;
      for (let t = 0; t < 4 && R.where() !== o.restMap; t++) { g = yield* C5.passBy(() => R.gotoMap(o.restMap)); if (g !== 'mapchanged') break; }
      R.battleOpts = keep;
      if (R.where() !== o.restMap) return 'rest: ' + g;
    }
    [].concat(o.restChoose || []).forEach(a => R.choices.push({ a, pc: -2 }));
    const r = yield* O.talk(o.restNpc);
    R.choices = R.choices.filter(c => c.pc !== -2);
    return r;
  };

  // The state C5a ends in (its c5a_end checkpoint, from the real C4 handoff), for 'node tools/run_runner.js --start c5b'. (The Enemy
  // Skill materia's Matra Magic can't be set by a start profile.)
  R.starts.c5b = {
    map: 'kalm_inn', entry: 'from_2f',
    members: ['cloud', 'barret', 'tifa', 'redxiii', 'aeris'], party: ['cloud', 'tifa', 'barret'],
    levels: { cloud: 14, barret: 13, tifa: 13, redxiii: 15, aeris: 10 },
    names: { cloud: 'Cloud', barret: 'Barret', tifa: 'Tifa', aeris: 'Aeris', redxiii: 'Red XIII' },
    flags: ['c1_train_talk', 'c1_bought_flower', 'c2_tifa_joined', 'c2_air_buster_beaten', 'c3_aeris_rejoined', 'c3_barret_joined',
      'c3_reno_beaten', 'c3_plate_fallen', 'c4_h0512_done', 'redxiii_joined', 'c4_eskill', 'c4_rufus_beaten', 'c4_bike',
      'c4_chase_done', 'c4_motorball_done', 'c4_decided', 'left_midgar', 'c5a_arrived', 'c5a_story_start',
      'c5a_fb_truck', 'c5a_fb_arrived', 'c5a_fb_mom', 'c5a_fb_piano', 'c5a_piano_tune', 'c5a_fb_night', 'c5a_fb_morning', 'c5a_piano_jammed',
      'c5a_fb_path', 'trig_fb_bridge_collapse', 'c5a_fb_bridge', 'c5a_fb_fall', 'c5a_fb_fountain', 'c5a_fb_door', 'c5a_fb_reactor', 'c5a_fb_days',
      'c5a_fb_mansion_in', 'c5a_fb_library1', 'c5a_fb_library2', 'c5a_fb_fire', 'c5a_fb_fire_seen', 'c5a_fb_chase', 'c5a_fb_tifa', 'c5a_fb_end',
      'has_phs', 'c5a_flashback_done', 'c5a_megalixir', 'c5a_ether_a', 'c5a_mako_asked', 'c5a_old_asked', 'c5a_ether_clock',
      'got_kalm_tower_peacemaker', 'c5a_guard_source', 'c5a_ether_far', 'c5a_geared', 'c5a_materia', 'c5a_potions'],
    vars: { aff_aeris: 1, c5a_party: 'tifa,redxiii', aff_barret: 5, aff_tifa: 2, c5a_cabinet: 5 },
    items: { potion: 26, phoenix_down: 5, ether: 13, grenade: 2, hyper: 1, echo_screen: 1, graviball: 1, ghost_hand: 3, elixir: 1,
      turbo_ether: 1, tranquilizer: 6, loco_weed: 8, megalixir: 1, peacemaker: 1, buster_sword: 1, titan_bangle: 1, four_slots: 1 },
    keyItems: ['phs'], gil: 5143, phs: true,
    equip: {
      cloud: { weapon: 'mythril_saber', armor: 'mythril_armlet', accessory: 'protect_vest' },
      barret: { weapon: 'cannon_ball', armor: 'mythril_armlet', accessory: 'star_pendant' },
      tifa: { weapon: 'mythril_claw', armor: 'mythril_armlet', accessory: 'star_pendant' },
      redxiii: { weapon: 'mythril_clip', armor: 'mythril_armlet', accessory: 'talisman' },
      aeris: { weapon: 'guard_stick', armor: 'iron_bangle' },
    },
    materia: {
      cloud: [{ id: 'lightning', ap: 474 }, { id: 'all', ap: 450 }, null, null, null],               // Mythril Saber (3) + Mythril Armlet (2)
      barret: [null, null, 'enemy_skill', null, null],                                               // Cannon Ball (3) + Mythril Armlet (2)
      tifa: [null, { id: 'ice', ap: 184 }, null, { id: 'steal', ap: 514 }, null],                   // Mythril Claw (3) + Mythril Armlet (2)
      redxiii: [{ id: 'restore', ap: 556 }, { id: 'all', ap: 124 }, { id: 'fire', ap: 574 }, { id: 'poison', ap: 72 }, { id: 'cover', ap: 12 }],
      aeris: [{ id: 'lightning', ap: 450 }, null],
    },
    stock: ['sense', { id: 'elemental', ap: 72 }],
  };


  R.plans.c5b = [
    ['chapter', 'c5b', 'Chapter 5b: Chocobo Farm to the cargo ship'],
    ['expect', 'c5a_flashback_done'],                               // the handoff from C5a
    ['battle', { limit: 'use' }],                                   // Limit Breaks as they come (new ones are learned by using them)

    // ---- the Chocobo Farm
    ['obj', 'Ask about the marsh at the Chocobo Farm'],
    ['goto', 'farm_yard'],
    ['expect', 'c5b_farm_arrived'],
    ['talk', 'choco_wark', { done: 'c5b_chocomog', choose: 'Wark!' }],   // the chocobo dance: Choco/Mog
    ['goto', 'farm_house'],
    ['talk', 'bill', { done: 'c5b_bill_talked', choose: 'Nothing' }],    // the marsh, the man in the cape
    // the grasslands (Levrikons, Mu, Mandragoras) for a few levels before the mine, and the gil for the Lure,
    // resting in Bill's spare beds (100 gil) between rounds
    ['c5a_train', 16, 2400, { world: [300, 164], terrain: 'gh', region: 'chocobo_farm_area', restMap: 'farm_house', restNpc: 'bill', restChoose: ['Rest for the night', 'Stay'], done: 'chocobo_lure', budget: 900000 }],
    ['goto', 'farm_stable'],
    ['talk', 'billy', { done: 'chocobo_lure', choose: ['Chocobo Lure', 'Buy it'] }],   // Chocobo Lure (2000)
    ['shop', 'billy', { choose: 'Buy greens', buy: [['gysahl_greens', 2]], lenient: true, done: { item: 'gysahl_greens', qty: 2 } }],

    // ---- across the marsh on a chocobo (nothing in the marsh catches one): the Chocobo Lure on, a wild
    // bird caught on the tracks north-west of the farm with a Gysahl Green, and ridden to the Mythril Mine
    ['obj', 'Catch a chocobo to cross the marsh'],
    ['catchChocobo', { then: 'ride', greens: 'gysahl_greens', done: 'c5b_zolom_seen', budget: 300000 }],
    ['obj', 'Ride across the marsh to the Mythril Mine'],
    ['world', 'mythril_mine_e', { via: 'chocobo', budget: 60000 }],
    ['expectMap', 'mine_marsh'],
    ['expect', 'c5b_zolom_seen'],
    ['save'],
    ['ckpt', 'c5b_mine'],

    // ---- the Mythril Mine: Long Range and the Ether up the vines, the Mind Source; the Grand Glove from
    // Madouges, Flame Thrower from the Ark Dragons
    ['obj', 'Search the Mythril Mine'],
    ['battle', { steal: ['grand_glove'], limit: 'use' }],
    ['goto', 'mine_cavern'],
    ['goto', 'mine_vines'],
    ['item', 'mine_vines_longrange'],                               // Long Range (up the vines)
    ['item', 'mine_vines_ether'],                                   // Ether
    ['goto', 'mine_cavern'],
    ['chest', 'mine_cavern_mindsource'],                            // Mind Source
    ['c5a_use', 'mind_source', 'cloud'],
    ['goto', 'mine_steps'],
    ['chest', 'mine_steps_tent'],                                   // Tent
    ['c5a_learn', 'flame_thrower', { maxBattles: 10, budget: 200000 }],
    ['battle', { steal: ['grand_glove'], limit: 'use' }],
    ['goto', 'mine_exit'],
    ['walk', 18, 6, { done: 'c5b_turks_mine' }],                    // the Turks: Rude, Elena, Tseng
    ['expect', 'c5b_turks_mine'],
    ['goto', 'mine_north'],
    ['chest', 'mine_north_elixir'],                                 // Elixir
    ['item', 'mine_north_hipotion'],                                // Hi-Potion
    ['autoequip', {}],                                              // the Grand Glove, if a Madouge gave one up
    ['battle', { limit: 'use' }],

    // ---- Fort Condor: join, battle 1 (Magic Comb). Over from the mine running from the fights in the
    // Mythril woods (packs of five Capparwires); gil on the fort's grass (Condor Area fights)
    ['obj', 'Help Fort Condor'],
    ['goto', 'world'],
    ['c5a_rest', 0.8],                                              // a Tent after the mine
    ['c5a_worldTo', 262, 192, { flee: true, done: 'c5b_condor_joined' }],
    ['battle', { steal: ['boomerang'], limit: 'use' }],
    ['c5a_grind', { gil: 4600 }, { world: [262, 192], terrain: 'gh', region: 'condor_area', maxBattles: 16, soft: true, budget: 300000, done: 'c5b_condor_w1' }],
    ['goto', 'condor_base'],
    ['talk', 'gate_guard', { done: 'c5b_condor_gate', choose: "We're here to help" }],
    ['goto', 'condor_hall'],
    ['talk', 'elder', { done: 'c5b_condor_joined', choose: "We'll help" }],
    ['c5b_fund', 4600, { done: 'c5b_condor_w1' }],
    ['minigame', 'fort_condor', { win: true }],
    ['talk', 'tactician', { done: 'c5b_condor_w1', choose: "Okay, I'm ready" }],
    ['expect', 'c5b_condor_w1', { soft: true }],
    ['autoequip', { reserve: true }],                               // the Magic Comb for Red XIII
    ['c5a_shop', 24, 7, { buy: [['potion', 12], ['tent', 2], ['hyper', 12]], lenient: true, done: 'c5b_condor_shop' }],   // the fort's item shop (Hypers: Fury for Aeris's training)
    ['js', (s) => { s.set('c5b_condor_shop'); return true; }],
    ['inn', 'c_nurse', { done: (s) => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp) }],   // free for friends of the fort
    // the Junon side's packs (five Capparwires, Formulas) hit hard: a few levels on the fort's grass first
    // (Condor Area fights), resting in its free beds. Aeris trains with them: she leaves the party for good at the
    // end of Disc 1, so an expert learns her Limit Breaks now (the Limit Break Mechanics guide: Healing Wind's uses
    // for Seal Evil, her own kills for Breath of the Earth; the others Defend and heal, Fury from Hypers, the foes
    // left standing to hit her; docs/RUNNER.md, Limit Breaks). Barret sits out (Matra Magic's materia goes to her)
    ['party', ['cloud', 'tifa', 'aeris'], { done: 'c5b_junon_arrived' }],
    ['autoMateria', { steal: 'tifa', eskill: ['aeris'], done: 'c5b_junon_arrived' }],
    ['battle', { steal: ['boomerang'], limit: 'use', limitTrain: { learners: ['aeris'], upTo: 3, turns: 24 }, fury: ['aeris'] }],
    ['c5a_train', 17, 0, { world: [262, 192], terrain: 'gh', region: 'condor_area', restMap: 'condor_hall', restNpc: 'c_nurse', restChoose: ['Stay'], done: 'c5b_junon_arrived', budget: 900000 }],
    ['battle', { steal: ['boomerang'], limit: 'use' }],
    ['useItem', 'tranquilizer', 'aeris', { done: (s) => !((FF7.state.chars.aeris.status || {}).fury) || !FF7.sys.inv.has('tranquilizer') }],
    ['party', ['cloud', 'tifa', 'barret'], { done: 'c5b_junon_arrived' }],

    // ---- Yuffie: the Mystery Ninja (32/256 in these forests). The little wood north of Fort Condor (Condor
    // Area) has the same odds without the Junon forests' packs of five Capparwires: back and forth between its
    // forest tile (259,183) and the grass below it, never onto the Mythril tiles around it, with a night in
    // the fort's free beds when the party is worn down
    ['obj', 'Find the Mystery Ninja in the forests'],
    ['c5b_ninja', 259, 183, { spots: [[259, 183], [259, 184]], restMap: 'condor_hall', restNpc: 'c_nurse', restChoose: ['Stay'], budget: 900000 }],
    ['battle', { limit: 'use' }],
    ['name', 'yuffie', 'Yuffie'],
    ['talk', 'ninja_yuffie', { map: 'side_ninja_clearing', done: 'yuffie_joined', choose: ['Not interested', 'petrified', 'Wait a second', "That's right", "Let's hurry on"] }],
    ['expect', 'yuffie_joined', { soft: true }],
    ['try', ['exit', 0, { done: (s, R2) => R2.where() !== 'side_ninja_clearing' }]],
    ['autoequip', { reserve: true }],

    // ---- Junon: Priscilla and Bottomswell (running from the fights in the Junon woods on the way)
    ['obj', 'Go west to Junon'],
    ['battle', { flee: true }],
    ['goto', 'junon_lower'],
    ['battle', { limit: 'use' }],
    ['expect', 'c5b_junon_arrived'],
    // Bottomswell floats out of reach and is weak to wind: Long Range and Elemental + Choco/Mog (wind) on
    // Cloud (the Walkthrough's setup), attack magic for Tifa
    ['loadout', 'cloud', { weapon: [['elemental', 'choco_mog']], armor: ['long_range', '*'], done: 'c5b_setup1' }],
    ['autoMateria', { members: ['barret', 'tifa'], steal: 'tifa', eskill: ['barret'], all: false, done: 'c5b_setup1' }],
    ['js', (s) => { s.set('c5b_setup1'); return true; }],
    ['save'],
    ['ckpt', 'c5b_bottomswell'],
    ['obj', 'Save Priscilla on the beach'],
    ['goto', 'junon_beach'],                                        // Bottomswell, then CPR (minigame)
    ['expect', 'c5b_bottomswell'],
    // gil for Fort Condor's second battle, on the grass by the fort (Condor Area fights), before the night
    ['c5a_worldTo', 256, 190, { flee: true, done: { any: ['c5b_junon_slept', { gil: 4600 }] } }],
    ['c5a_grind', { gil: 4600 }, { world: [256, 190], terrain: 'gh', region: 'condor_area', maxBattles: 12, soft: true, budget: 300000, done: { any: ['c5b_junon_slept', { gil: 4600 }] } }],
    ['battle', { flee: true }],
    ['goto', 'junon_lower'],
    ['battle', { limit: 'use' }],
    ['talk', 'grandma', { done: 'c5b_junon_slept', choose: "We'll rest" }],   // the night; Cloud's dream
    ['expectMap', 'junon_house'],
    ['expect', 'c5b_junon_slept'],

    // ---- Fort Condor battle 2 (Peace Ring): its window is between the night and Priscilla's gift.
    // Cloud walks alone from here to the ship: Restore + All on him, the best gear in the bag
    ['obj', 'Fort Condor needs help again'],
    // alone, he runs from the random battles (a pack of five Capparwires in the Junon woods is more than
    // one man can take), and the gil the fort wants comes from a few Ethers sold at its shop
    ['battle', { flee: true }],
    ['loadout', 'cloud', { weapon: [['restore', 'all']], armor: ['lightning', 'ice'], done: 'c5b_solo' }],
    ['autoequip', { done: 'c5b_solo' }],
    ['js', (s) => { s.set('c5b_solo'); return true; }],
    ['c5b_solo', 'condor_hall', { done: 'c5b_condor_w2' }],
    ['c5b_fund', 4600, { done: 'c5b_condor_w2' }],
    ['heal', { below: 0.9 }],
    ['goto', 'condor_hall'],
    ['minigame', 'fort_condor', { win: true }],
    ['talk', 'tactician', { done: 'c5b_condor_w2', choose: "Okay, I'm ready" }],
    ['expect', 'c5b_condor_w2', { soft: true }],
    ['inn', 'c_nurse', { done: (s) => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp) }],
    ['c5b_solo', 'junon_lower', { done: 'c5b_tifa_talk' }],

    // ---- Tifa by the sea, Priscilla's Shiva, the whistle
    ['obj', 'Find Tifa by the sea wall'],
    ['talk', 'v_tifa', { done: 'c5b_tifa_talk', choose: 'Are you all right' }],
    ['walk', 9, 7, { done: 'c5b_shiva' }],                          // Priscilla: the Shiva materia
    ['expect', 'c5b_shiva'],
    ['goto', 'junon_beach'],
    ['talk', 'pris_beach', { done: 'c5b_whistle' }],                // how to call Mr. Dolphin
    // into the water (Barret takes the PHS), but not yet: Fort Condor battle 3 first (Ether x3)
    ['c5a_walkTo', 8, 14, 'c5b_in_water', { choose: 'Not yet' }],
    ['expect', 'c5b_in_water'],
    ['obj', 'Fort Condor: the third attack'],
    ['heal', { below: 0.95 }],
    ['c5b_solo', 'condor_hall', { done: 'c5b_condor_w3' }],
    ['c5b_fund', 4600, { done: 'c5b_condor_w3' }],
    ['goto', 'condor_hall'],
    ['minigame', 'fort_condor', { win: true }],
    ['talk', 'tactician', { done: 'c5b_condor_w3', choose: "Okay, I'm ready" }],
    ['expect', 'c5b_condor_w3', { soft: true }],
    ['inn', 'c_nurse', { done: (s) => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp) }],
    ['c5b_solo', 'junon_beach', { done: 'c5b_dolphin_jump' }],
    ['obj', 'Ride Mr. Dolphin up to the tower'],
    ['minigame', 'dolphin', { win: true }],
    ['c5a_walkTo', 8, 14, 'c5b_dolphin_jump', { choose: 'Blow the whistle' }],
    ['expectMap', 'junon_airport'],
    ['expect', 'c5b_dolphin_jump'],
    ['ckpt', 'c5b_upper_junon'],

    // ---- upper Junon: the barracks and the welcome parade (50%+: 5000 gil)
    ['obj', 'Blend in with the Shinra soldiers'],
    ['choose', 'Yes, sir', 'Present arms'],
    ['minigame', 'parade', { win: true }],
    ['exit', 'junon_barracks', { done: 'c5b_disguised' }],
    ['expectMap', 'junon_street1'],
    ['expect', 'c5b_parade_done'],

    // ---- Junon's treasures and shops
    ['obj', 'Explore Junon before the send-off'],
    ['goto', 'junon_apt'],
    ['items'],                                                      // Enemy Skill, 1/35 soldier, Mind / Luck / Power / Guard Source
    ['c5a_use', 'mind_source', 'cloud'], ['c5a_use', 'luck_source', 'cloud'], ['c5a_use', 'power_source', 'cloud'], ['c5a_use', 'guard_source', 'cloud'],
    ['autoMateria', { steal: 'tifa', eskill: ['barret', 'tifa'], all: false, keep: { cloud: ['long_range'] }, done: 'c5b_setup2' }],   // the second Enemy Skill materia
    ['js', (s) => { s.set('c5b_setup2'); return true; }],
    ['goto', 'junon_street2'],
    ['goto', 'junon_rooms'],
    ['items'],                                                      // Speed Source, 1/35 soldier
    ['c5a_use', 'speed_source', 'cloud'],
    // (Red XIII's Mythril Clip: sold only here, before Disc 2 - FF7's 100% owns every weapon)
    ['goto', 'junon_street2', { done: { item: 'mythril_clip' } }],
    ['buyNew', { shop: [28, 3], kinds: 'weapon', only: ['mythril_clip'], keepGil: 3000, done: (s) => R.gear.owned('mythril_clip') > 0 }],
    ['goto', 'junon_street1'],
    // the alley weapon shop: Tifa's and Barret's weapons (Cloud's Force Stealer comes from the send-off)
    ['gear', { shop: [19, 2], members: ['tifa', 'barret'], keepGil: 3500, done: 'c5b_gear_junon' }],
    ['c5a_shop', 14, 3, { buy: [['hi_potion', 6]], lenient: true, done: 'c5b_gear_junon' }],   // item shop
    ['js', (s) => { s.set('c5b_gear_junon'); return true; }],
    ['goto', 'junon_inn'],
    ['c5a_shop', 11, 2, { buy: [['headband', 1]], lenient: true, done: { any: [{ item: 'headband' }, (s) => Object.values(FF7.state.chars).some(c => c.accessory === 'headband')] } }],
    ['try', ['equip', 'tifa', 'accessory', 'headband']],

    // ---- the send-off at the harbor (the Send-off Ceremony minigame, its bot: 100+ points, the Force Stealer), the cargo ship
    ['obj', "Join the President's send-off at the harbor"],
    ['goto', 'junon_dock'],
    ['expect', 'c5b_sendoff_done'],
    ['autoequip', {}],                                              // the Force Stealer (double growth)
    ['obj', 'Board the cargo ship'],
    ['exit', [25, 9], { done: 'c5b_ship_boarded', choose: 'Board' }],
    ['expectMap', 'ship_hold'],
    ['expect', 'c5b_ship_boarded'],
    ['ckpt', 'c5b_ship'],

    // ---- the cargo ship: find the others, the alarm, Jenova-BIRTH
    ['obj', 'Find the others on the ship'],
    ['chest', 'ship_hold_ether'],                                   // Ether
    ['talk', 'aeris_dis', { done: 'c5b_ship_aeris', choose: 'You look great' }],
    ['goto', 'ship_deck'],
    ['walk', 16, 3, { done: 'c5b_ship_tifa' }],                      // on the deck below the lookout (the ladder's
    ['talk', 'tifa_dis', { done: 'c5b_ship_tifa', choose: "I'm fine" }],   // top can't be stood on squarely)
    ['talk', 'red_dis', { done: 'c5b_ship_red' }],
    ['party', ['cloud', 'tifa', 'barret'], { select: true }],
    ['talk', 'barret_dis', { done: 'c5b_ship_alarm' }],             // the alarm; the PHS back; the party
    ['expect', 'c5b_ship_alarm'],
    ['battle', { limit: 'use' }],
    ['talk', 'deck_sailor', { choose: "I'm tired", done: (s) => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp) }],
    ['goto', 'ship_hold'],
    ['item', 'ship_hold_all'],                                      // All (where Yuffie was sitting)
    ['goto', 'ship_engine'],
    ['chest', 'ship_engine_windslash'],                             // Wind Slash (up on the catwalk)
    ['autoequip', { reserve: true }],                               // Wind Slash for Yuffie
    ['autoMateria', { steal: 'tifa', eskill: ['barret', 'tifa'], all: false, done: 'c5b_setup3' }],   // the second All
    ['js', (s) => { s.set('c5b_setup3'); return true; }],
    // the Shinra Beta (the Item_Materia Locations FAQ: stolen from the ship's Marines, or a Submarine Crew's drop on
    // Disc 2 - neither after the Underwater Reactor): the alarm's fights here until Tifa has stolen one
    ['obj', "The Shinra Beta: a Marine's steal in the hold", { done: (s, R) => R.gear.owned('shinra_beta') > 0 }],
    ['battle', { steal: ['shinra_beta'], stealHold: 30, limit: 'use' }],
    ['fightUntil', (s, R) => R.gear.owned('shinra_beta') > 0, { max: 8, at: 'ship_hold', done: 'c5b_jenova_birth' }],   // (the hold: room to pace)
    ['battle', { limit: 'use' }],
    ['goto', 'ship_engine', { done: 'c5b_jenova_birth' }],
    ['save'],
    ['ckpt', 'c5b_birth'],
    ['obj', 'Stop Jenova-BIRTH'],
    ['walk', 17, 7, { done: 'c5b_jenova_birth' }],                  // Sephiroth; Jenova-BIRTH
    ['expect', 'c5b_jenova_birth'],
    ['item', 'ship_engine_ifrit'],                                  // Ifrit (where it fell)
    ['obj', 'Leave the ship at Costa del Sol'],
    ['party', ['cloud', 'tifa', 'barret'], { select: true }],        // C6a: the party picked on the pier
    ['exit', [0, 4], { done: 'c5b_arrived' }],
    ['expectMap', 'costa_port'],
    ['expect', 'c5b_arrived'],
    ['ckpt', 'c5b_end'],
  ];
})();

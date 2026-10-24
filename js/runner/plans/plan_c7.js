// Runner plan, Chapter 7 (docs/RUNNER.md): Nibelheim, the Shinra Mansion, Mt. Nibel, Rocket Town and Wutai.
// From Cosmo Canyon (C6b's end) north to the rebuilt Nibelheim: the men in black cloaks (Luck Source x2,
// Elixir, Turbo Ether, Platinum Fist), Tifa's piano (1 gil), the mansion (Silver M-phone, Twin Viper, Enemy
// Launcher, Magic Source; the safe: Lost Number -> Cosmo Memory, Odin, Basement Key; Sephiroth in the
// library -> Destruct; Vincent in his coffin), Mt. Nibel (Rune Blade, Plus Barrette, the pipes: All,
// Powersoul; Elixir, Elemental, Sniper CR; the Materia Keeper -> Jem Ring, Counter Attack), Rocket Town
// (Power Source, Drill Arm, Yoshiyuki; Cid, Palmer -> Edincoat, the Tiny Bronco), then Wutai by boat:
// Yuffie's materia heist and the chase (MP Absorb, Corneo, the shrine: Swift Bolt, Elixir; Da-chao: Dragoon
// Lance, Rapps -> Peace Ring), the cat house (HP Absorb), Godo's hidden rooms (Magic Shuriken, Hairpin), the
// Turtle's Paradise flyer prize (the Pagoda, Yuffie alone against the Five Mighty Gods, is done in C12b).
// Ends on the world map outside Wutai, the Tiny Bronco on the shore.
// E.Skills tried here: ???? (Jersey, Manipulated), Flame Thrower (Dragon, Mt. Nibel caves), Trine (the
// Materia Keeper), Magic Hammer (Razor Weed, Manipulated, on the world map outside Wutai).
// Not in this game: Steal as Well and the Oritsuru in the Da-chao fire cave need the Leviathan Scales (C10);
// the Fourth Bracelet and Guard Source in Rocket Town appear with the Highwind (Disc 2).
(function () {
  const R = FF7.runner;
  // the player's tile on this map (resumable one-shot moves such as the Mt. Nibel pipe slides)
  const at = (map, fn) => (s, R) => { const f = R.field(); return !!f && f.map.id === map && fn(f.player.tx, f.player.ty); };
  // the active party is (nearly) at full HP and MP: no Tent needed at this save point
  const fresh = () => FF7.sys.party.active().every(c => c.hp >= c.maxHp * 0.85 && c.mp >= c.maxMp * 0.6);
  // Lost Number splits at half HP into the half its last hit matches: magic -> the psychic half (Def 40, the
  // party's weapons finish it), physical -> the physical half (Def 400, Lost Blow). From 70% down only magic
  // touches it, so it splits psychic. (['battle', { turn: LN_MAGIC }]: a physical choice of the Auto AI
  // becomes the strongest damage spell, E.Skill or summon it can afford, else Defend)
  const LN_MAGIC = (b, p) => {
    const ln = b.enemies.find(e => e.alive && e.id === 'lost_number');
    if (!ln || ln.hp > ln.maxHp * 0.7) return null;
    const D = FF7.data, C = FF7.battle.calc, g0 = p.limitGauge;
    const act = (R.origAutoBattle || FF7.battle.ai.autoBattle)(b, p);
    const phys = (a) => a.type === 'attack' || a.type === 'mug' || a.type === 'morph' || (a.type === 'limit' && (D.limits[a.id] || {}).kind === 'phys')
      || (a.type === 'eskill' && !!(D.eskills[a.id] || {}).phys);
    if (!act || act.side !== 'enemy' || !phys(act)) return act;
    if (act.type === 'limit') p.limitGauge = g0;                      // (kept for later)
    if (p.has('silence')) return { actor: p, type: 'defend' };
    const ok = (d) => d && d.kind === 'damage' && !d.phys && p.mp >= (d.mp || 0) && !C.elemInfo(ln, [].concat(d.element || [])).immune && !C.elemInfo(ln, [].concat(d.element || [])).absorb;
    const opts = [];
    ((p.abilities && p.abilities.spells) || []).forEach(s => { const d = D.spells[s.id]; if (ok(d)) opts.push({ pw: d.power || 0, a: { actor: p, type: 'magic', id: s.id, targets: [ln], side: 'enemy' } }); });
    ((p.abilities && p.abilities.eskills) || []).forEach(id => { const d = D.eskills[id]; if (ok(d)) opts.push({ pw: d.power || 0, a: { actor: p, type: 'eskill', id, targets: [ln], side: 'enemy' } }); });
    ((p.abilities && p.abilities.summons) || []).forEach(s => { const id = s.id, d = D.summons[id];
      if (ok(d) && (p.summonUses[id] || 0) < (s.uses || 1)) opts.push({ pw: d.power || 0, sum: id, a: { actor: p, type: 'summon', id, all: true, targets: b.enemies.filter(e => e.targetable), side: 'enemy' } }); });
    const best = opts.sort((x, y) => y.pw - x.pw)[0];
    if (!best) return { actor: p, type: 'defend' };
    if (best.sum) p.summonUses[best.sum] = (p.summonUses[best.sum] || 0) + 1;
    return best.a;
  };

  // ---------------------------------------------------------------- start profile
  // C6b's real end state (its c6b_end checkpoint, played from C6a's): the Cosmo Canyon inn after the
  // night's rest; every flag C1-C6b set; the Enemy Skill materia with what they learned.
  const FLAGS_C7 = (
    'aeris_joined c12a_caught_chocobo c12a_ninja_met c12a_ninja_talk c1_bought_flower c1_train_talk c4_decided c4_eskill c5a_arrived c5a_ether_a ' +
    'c5a_ether_clock c5a_ether_far c5a_fb_arrived c5a_fb_bridge c5a_fb_chase c5a_fb_days c5a_fb_door c5a_fb_end c5a_fb_fall c5a_fb_fire c5a_fb_fire_seen ' +
    'c5a_fb_fountain c5a_fb_library1 c5a_fb_library2 c5a_fb_mansion_in c5a_fb_mom c5a_fb_morning c5a_fb_night c5a_fb_path c5a_fb_piano c5a_fb_reactor ' +
    'c5a_fb_tifa c5a_fb_truck c5a_flashback_done c5a_geared c5a_guard_source c5a_mako_asked c5a_materia c5a_megalixir c5a_old_asked c5a_piano_jammed ' +
    'c5a_piano_tune c5a_potions c5a_story_start c5b_airport_arrived c5b_arrived c5b_bill_talked c5b_billy_talked c5b_bottomswell c5b_chocomog ' +
    'c5b_condor_fund c5b_condor_gate c5b_condor_joined c5b_condor_shop c5b_condor_w1 c5b_condor_w2 c5b_condor_w3 c5b_disguised c5b_dolphin_jump ' +
    'c5b_engine_seen c5b_farm_arrived c5b_gear_junon c5b_in_water c5b_jenova_birth c5b_junon_arrived c5b_junon_slept c5b_mine_entered c5b_parade_done ' +
    'c5b_phs_taken c5b_priscilla_saved c5b_sendoff_done c5b_setup1 c5b_setup2 c5b_setup3 c5b_ship_aeris c5b_ship_alarm c5b_ship_boarded c5b_ship_intro ' +
    'c5b_ship_red c5b_ship_tifa c5b_shiva c5b_solo c5b_tifa_talk c5b_turks_mine c5b_undisguised c5b_whistle c5b_zolom_seen c6a_arrived c6a_ball ' +
    'c6a_barret_left c6a_barret_rejoined c6a_barret_story c6a_bridge_down c6a_buggy_setup c6a_costa_left c6a_done c6a_dyne_done c6a_framed c6a_gbike_prize ' +
    'c6a_gear_costa c6a_gear_ncorel c6a_hojo_talked c6a_jockey_intro c6a_johnny_tifa c6a_junk_seen c6a_miner_talked c6a_mog_cleared c6a_mog_reward ' +
    'c6a_ncorel_arrival c6a_ncorel_ether c6a_nest c6a_oldman_talked c6a_prison_arrival c6a_prison_setup c6a_prison_shop c6a_race_explained c6a_race_intro ' +
    'c6a_race_started c6a_saw_saucer c6a_turtle_flyer3 c6a_umbrella c6a_waterside_seen c6a_wizard_staff c6b_buggy_repaired c6b_candle_done c6b_candle_intro ' +
    'c6b_candle_start c6b_cosmo_arrived c6b_done c6b_elixir c6b_farewell c6b_gi_asked c6b_gi_intro c6b_gi_nattak c6b_gi_oil_seen c6b_gi_open c6b_gi_rock3 ' +
    'c6b_gi_secret c6b_gi_web c6b_gongaga_arrived c6b_met_bugen c6b_planetarium c6b_reactor_scene c6b_reactor_seen c6b_rested c6b_seto c6b_shopped ' +
    'c6b_titan c6b_turks_done c6b_turtle_flyer4 c6b_turtle_flyer5 c6b_village_seen c6b_wasteland_seen c6b_zack_friends c6b_zack_heard cait_joined ' +
    'chocobo_lure got_costa_villa_firering got_costa_villa_motordrive got_costa_villa_powersource got_gi_caverns_added_effect got_gi_nattak_fairy_ring ' +
    'got_gi_nattak_turbo_ether got_gi_oil_black_mphone got_gi_oil_ether got_gi_web_xpotion got_gongaga_house_mphone got_gongaga_inn_xpotion ' +
    'got_gongaga_jungle2_deathblow got_gs_jockey_ramuh got_junon_apt_eskill got_junon_apt_guard got_junon_apt_luck got_junon_apt_mind got_junon_apt_power ' +
    'got_junon_apt_soldier got_junon_rooms_soldier got_junon_rooms_speed got_kalm_tower_peacemaker got_mine_cavern_mindsource got_mine_north_elixir ' +
    'got_mine_north_hipotion got_mine_steps_tent got_mine_vines_ether got_mine_vines_longrange got_mtcorel_cave_mindsource got_mtcorel_cave_powersource ' +
    'got_mtcorel_cave_tent got_mtcorel_tracks2_starpendant got_mtcorel_tracks2_transform got_mtcorel_tracks2_turboether got_mtcorel_tracks2_wmg ' +
    'got_ship_engine_ifrit got_ship_engine_windslash got_ship_hold_all got_ship_hold_ether has_buggy has_phs left_midgar trig_fb_bridge_collapse ' +
    'trig_gi_nattak_boss trig_gongaga_jungle1_turks trig_gongaga_reactor_scarlet trig_junon_airport_highwind trig_junon_lower_priscilla_gift ' +
    'trig_junon_street2_glimpse trig_mine_exit_turks trig_mine_vines_vine_hint trig_mtcorel_bridge_creak trig_mtcorel_cabin_birds ' +
    'trig_mtcorel_tracks1_weak2 trig_mtcorel_tracks2_dead_end trig_prison_dyne_dyne trig_ship_engine_birth yuffie_joined ').trim().split(/\s+/);
  R.starts.c7 = {
    map: "cosmo_inn", entry: "from_plaza",
    members: ["cloud","tifa","aeris","redxiii","yuffie","caitsith","barret"],
    party: ["cloud","tifa","yuffie"],
    levels: {"cloud":31,"tifa":27,"aeris":25,"redxiii":29,"yuffie":29,"caitsith":25,"barret":27},
    names: {"cloud":"Cloud","tifa":"Tifa","aeris":"Aeris","redxiii":"Red XIII","yuffie":"Yuffie","caitsith":"Cait Sith","barret":"Barret"},
    phs: true,
    flags: FLAGS_C7,
    vars: {"c12b_on_choco":0,"c5a_party":"barret,tifa","aff_barret":5,"c5a_cabinet":5,"aff_tifa":0,"chocobo_pen":[],"chocobo_color":"yellow","c12a_riding":0,"c5b_condor_funds":10000,"mg_best_fort_condor":620,"c5b_condor_prize":3,"mg_best_cpr":5,"mg_best_dolphin":100,"mg_best_parade":66,"aff_aeris":15,"mg_best_motorcycle_gbike":19975,"mg_best_shooting_speed_square":7720,"turtle_flyers":3,"mg_esther_try":0,"mg_best_chocobo_race":6},
    items: {"phoenix_down":20,"ether":10,"elixir":4,"hyper":2,"tranquilizer":1,"grenade":2,"megalixir":1,"peacemaker":1,"lasan_nut":1,"mythril_clip":1,"bronze_bangle":1,"tent":6,"1_35_soldier":2,"buster_sword":1,"4_point_shuriken":1,"motor_drive":1,"w_machine_gun":1,"bolt_plume":3,"star_pendant":2,"mythril_rod":1,"t_s_bomb":2,"hi_potion":46,"wizard_staff":1,"fairy_tale":1,"x_potion":1,"white_m_phone":1,"wind_slash":1,"m_tentacles":5,"black_m_phone":1,"fairy_ring":1,"turbo_ether":1,"wizer_staff":1,"magic_comb":1,"force_stealer":1,"mythril_armlet":2},
    keyItems: ["phs"],
    gil: 25727,
    vehicles: {"buggy":{"x":115,"y":208}},
    equip: {
      cloud: {"weapon":"butterfly_edge","armor":"silver_armlet","accessory":"power_wrist"},
      tifa: {"weapon":"tiger_fang","armor":"silver_armlet","accessory":"protect_vest"},
      aeris: {"weapon":"umbrella","armor":"titan_bangle","accessory":"peace_ring"},
      redxiii: {"weapon":"seraph_comb","armor":"mythril_armlet","accessory":"white_cape"},
      yuffie: {"weapon":"pinwheel","armor":"silver_armlet","accessory":"fire_ring"},
      caitsith: {"weapon":"yellow_m_phone","armor":"silver_armlet","accessory":"headband"},
      barret: {"weapon":"atomic_scissors","armor":"mythril_armlet","accessory":"talisman"},
    },
    materia: {
      cloud: ["time",{"id":"enemy_skill","eskills":["matra_magic","laser","aqualung","big_guard","frog_song","death_sentence"]},"poison","transform","choco_mog","shiva","restore","ice"],
      tifa: ["restore","all","cover",null,null,null,"fire","ifrit"],
      yuffie: ["lightning","all","steal",{"id":"enemy_skill","eskills":["matra_magic","flame_thrower","laser","aqualung","big_guard","frog_song","death_sentence"]},"ramuh","titan","manipulate","gravity"],
      barret: [null,null,null,"long_range"],
    },
    stock: ["sense","chocobo_lure","elemental","throw","deathblow","added_effect"],
  };

  // ---------------------------------------------------------------- the plan
  FF7.runner.plans.c7 = [
    ['chapter', 'c7', 'Chapter 7: Nibelheim, Rocket Town and Wutai'],
    ['expect', 'c6b_done', { soft: true }],                                         // C6b's handoff: Seto, Nanaki's farewell

    // ---- Nibelheim
    ['obj', 'Head north to Nibelheim'],
    ['world', 'nibelheim'],
    ['expectMap', 'nibel_town'],
    ['expect', 'c7_nibel_arrived'],                                 // the town, rebuilt; the men in black
    ['obj', 'Search Nibelheim'],
    ['goto', 'nibel_inn'],
    ['talk', 'cloak_inn', { done: 'c7_clgift_cloak_inn' }],         // Luck Source
    ['goto', 'nibel_house'],
    ['talk', 'cloak_fire', { done: 'c7_clgift_cloak_fire' }],       // Elixir
    ['goto', 'nibel_shop'],
    ['talk', 'cloak_kid1', { done: 'c7_clgift_cloak_kid1' }],       // Luck Source
    ['shop', 'shopkeeper', { buy: [['hi_potion', 8], ['tent', 3]], lenient: true }],   // the general store: supplies for the mansion
    ['goto', 'nibel_tifa_house'],
    ['talk', 'cloak_tifa1', { done: 'c7_clgift_cloak_tifa1' }],     // Turbo Ether
    ['talk', 'cloak_tifa2', { done: 'c7_clgift_cloak_tifa2' }],     // Platinum Fist
    // Tifa's piano: Do Re Mi Ti La Do Re Mi So Fa Do Re Do (the flashback's tune) -> 1 gil
    ['use', 13, 1, { done: 'c7_piano_gil', choose: ['Play it', 0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0, 'Stop'] }],

    // ---- the Shinra Mansion: the treasure rooms
    ['obj', 'Search the Shinra Mansion'],
    ['goto', 'mansion_1f_east'],
    ['chest', 'mansion_1fe_mphone'],                                // Silver M-phone
    ['goto', 'mansion_1f_north'],
    ['chest', 'mansion_1fn_viper'],                                 // Twin Viper
    ['goto', 'mansion_2f_east'],
    ['chest', 'mansion_2fe_msource'],                               // Magic Source
    ['goto', 'mansion_2f_west'],
    ['chest', 'mansion_2fw_launcher'],                              // Enemy Launcher
    // the training here doubles as Aeris's: her level 3 Limit Breaks before she leaves (Planet Protector from her
    // kills, Pulse of Life from its uses: the Limit Break Mechanics guide's way, as on the Condor grass in C5b);
    // Tifa sits it out, the master Enemy Skill materia goes to Aeris (Matra Magic for the kills, ???? to learn)
    ['party', ['cloud', 'aeris', 'yuffie'], { done: (s) => s.flag('c7_safe_open') || FF7.state.chars.aeris.limitsKnown.includes('pulse_of_life') }],
    ['autoMateria', { steal: 'yuffie', eskill: ['aeris', 'cloud'], healer: 'aeris', done: (s) => s.flag('c7_safe_open') || FF7.state.chars.aeris.limitsKnown.includes('pulse_of_life') }],
    ['battle', { learn: ['question'], limitTrain: { learners: ['aeris'], upTo: 3, turns: 24 }, fury: ['aeris'] }],   // ???? (the Jerseys cast it): learned while training here
    ['c6b_level', 34, { budget: 600000 }],                                                // Lost Number is level 35 (and splits in two)
    ['learnLimits', { members: ['aeris'], upTo: 3, max: 30, done: (s) => !FF7.state.party.includes('aeris') }],   // (her uses, when the levels came first)
    ['limitReady', 'aeris', { upTo: 3, max: 40, done: (s) => !FF7.state.party.includes('aeris') }],   // (her kills, likewise)
    ['c6b_learn', ['question'], { battles: 10, budget: 300000 }],   // (if no Jersey came along while training)
    ['battle', {}],
    ['useItem', 'tranquilizer', 'aeris', { done: (s) => !((FF7.state.chars.aeris.status || {}).fury) || !FF7.sys.inv.has('tranquilizer') }],
    ['party', ['cloud', 'tifa', 'yuffie'], { done: 'c7_safe_open' }],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa', done: 'c7_safe_open' }],
    // the safe: Right 36, Left 10, Right 59, Right 97 (the clues: the chest lid, behind the piano, the
    // creaking board, the letter's hidden line) -> Lost Number
    ['save'],                                                       // the save point by the safe room
    ['useItem', 'tent', 'cloud', { done: fresh }],                  // a Tent at the save point before the safe
    ['ckpt', 'c7_safe'],
    ['obj', 'Open the safe'],
    ['battle', { turn: LN_MAGIC }],                                 // Lost Number: magic from 70% down (its psychic half)
    ['use', 21, 1, { done: 'c7_safe_open', choose: ['Try it', 0, 3, 6, 1, 1, 0, 0, 5, 9, 0, 9, 7] }],   // Lost Number (Cosmo Memory), Odin, Basement Key
    ['expect', 'c7_safe_open'],
    ['battle', {}],

    // ---- the basement: Sephiroth, Vincent
    ['obj', 'Find Sephiroth in the basement'],
    ['goto', 'mansion_hall'],
    ['exit', [27, 0], { done: 'c7_mansion_passage', choose: 'Push it' }],   // the loose wall panel
    ['goto', 'mansion_basement'],
    ['walk', 23, 9, { done: 'c7_seph_library' }],                   // the library: Sephiroth (Destruct)
    ['expect', 'c7_seph_library'],
    ['obj', 'Open the locked door in the basement'],
    ['goto', 'mansion_coffin'],                                     // the Basement Key
    ['use', 9, 4, { done: 'c7_vincent_1' }],                        // the man in the coffin
    ['use', 9, 4, { done: 'c7_vincent_2' }],                        // ...a former Turk
    ['name', 'vincent', 'Vincent'],
    ['walk', 11, 7, { done: 'vincent_joined' }],                    // on the way out: Vincent joins
    ['expect', 'vincent_joined'],

    // ---- Mt. Nibel
    ['obj', 'Cross Mt. Nibel'],
    ['goto', 'mtnibel_path'],
    ['item', 'mtnibel_rune_blade'],                                 // Rune Blade
    ['item', 'mtnibel_plus_barrette'],                              // Plus Barrette
    ['goto', 'mtnibel_pipes'],
    ['walk', 31, 14, { done: 'c7_nibel_ladder', choose: 'Lower the ladder' }],   // the rope ladder by the drop
    ['use', 11, 9, { done: 'got_mtnibel_all', choose: 'Slide down' }],           // pipe 4 -> the ledge
    ['item', 'mtnibel_all'],                                        // All
    ['use', 11, 15, { done: at('mtnibel_pipes', (x, y) => y >= 16), choose: 'Jump' }],
    ['use', 21, 9, { done: 'got_mtnibel_powersoul', choose: 'Slide down' }],     // back up the ladder, pipe 2
    ['chest', 'mtnibel_powersoul'],                                 // Powersoul
    ['use', 21, 15, { done: at('mtnibel_pipes', (x, y) => y >= 16), choose: 'Jump' }],
    ['goto', 'mtnibel_cave1'],
    ['chest', 'mtnibel_cave1_elixir'],                              // Elixir
    ['c6b_learn', ['flame_thrower'], { battles: 6, budget: 300000 }],               // the Dragon of the Mt. Nibel caves
    ['goto', 'mtnibel_ledge'],
    ['item', 'mtnibel_elemental'],                                  // Elemental
    ['goto', 'mtnibel_cave2'],
    ['chest', 'mtnibel_cave2_sniper'],                              // Sniper CR
    ['expect', 'got_mtnibel_cave2_sniper'],                         // (a resume guard: the last item before the reactor)
    ['goto', 'mtnibel_reactor'],                                    // the fountain on the way
    ['walk', 16, 6, { done: 'c7_reactor_seen' }],                   // the reactor, sealed
    ['autoequip', {}],                                              // Rune Blade, Powersoul, ...
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa' }],
    ['c6b_level', 34, { budget: 600000 }],
    ['save'],                                                       // the save point below the reactor
    ['useItem', 'tent', 'cloud', { done: fresh }],
    ['ckpt', 'c7_keeper'],
    ['obj', 'Defeat the Materia Keeper'],
    // Trine: the Keeper casts it only after a Cure2, which it casts only under half its HP - so it is chipped down with
    // plain attacks to under 45%, then spared (the party healed meanwhile) until its Trine has hit (a full run's Keeper
    // was spared at full HP for 30 turns, never cast it, and the skill was missed)
    ['battle', { learn: { skill: 'trine', enemyHpBelow: 0.45, hold: true, turns: 120 } }],
    ['goto', 'mtnibel_pipes'],                                      // the top of the "5 pipe" cliff
    ['walk', 16, 4, { done: 'c7_keeper_dead' }],                    // the Materia Keeper (Jem Ring, Counter Attack)
    ['expect', 'c7_keeper_dead'],
    ['battle', {}],

    // ---- Rocket Town
    ['obj', 'Go on to Rocket Town'],
    ['world', 'rocket_town'],
    ['expectMap', 'rocket_town'],
    ['goto', 'rocket_house_e'],
    ['chest', 'rocket_house_e_power'],                              // Power Source
    ['goto', 'rocket_town'],
    ['talk', 'oldman', { times: 2, done: 'c7_yoshiyuki', choose: 'Look at the rocket' }],   // Yoshiyuki
    ['goto', 'rocket_weapons'],
    ['gear', { shop: 'shopkeeper', keepGil: 3000 }],
    ['buyNew', { shop: 'shopkeeper', kinds: 'weapon', only: ['shotgun'], keepGil: 20000 }],   // (Vincent's Shotgun: sold here only before the Highwind)
    ['goto', 'rocket_items'],
    // Barrier, and Time when Gongaga's counter (C6b) came before the gil did: Haste for C10's Carry Armor setup, Slow for
    // C12b's Emerald WEAPON (a full run without it lost Emerald three times: it acted twice between Cloud's Mimes).
    // Exit waits for Disc 2: gil for Mideel's shops
    ['buyNew', { shop: 'shopkeeper', choose: 'Materia', kinds: [], want: { barrier: 1, time: 1 }, keepGil: 10000 }],
    ['goto', 'rocket_cid_house'],                                   // Shera
    ['chest', 'rocket_cid_drill_arm'],                              // Drill Arm
    ['obj', 'Find the Captain at the rocket'],
    ['goto', 'rocket_pad', { done: 'c7_cid_met' }],
    ['walk', 22, 9, { done: 'c7_cid_met' }],                        // up the gantry stairs (the catwalk is above the pad:
    ['walk', 21, 5, { done: 'c7_cid_met' }],                        //  the runner's look-ahead would cut across the drop)
    ['exit', 'rocket_engine', { done: 'c7_cid_met' }],
    ['walk', 5, 5, { done: 'c7_cid_met' }],                         // Cid, in the engine room
    ['expect', 'c7_cid_met'],
    ['obj', "Have tea at Cid's house"],
    ['goto', 'rocket_cid_house'],                                   // the tea; Rufus arrives
    ['expect', 'c7_tea'],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'], healer: 'tifa' }],
    ['goto', 'rocket_town'],
    ['save'],                                                       // the save point by the fence
    ['useItem', 'tent', 'cloud', { done: fresh }],
    ['ckpt', 'c7_palmer'],
    ['obj', 'Stop Palmer'],
    ['name', 'cid', 'Cid'],
    ['party', ['cloud', 'cid', 'yuffie'], { select: true }],        // the party screen after the Bronco's crash
    ['goto', 'rocket_cid_house'],
    ['exit', 'rocket_cid_yard', { done: 'has_bronco' }],            // Palmer (Edincoat); the Tiny Bronco; Cid joins
    ['expect', 'cid_joined'],
    ['expect', 'has_bronco'],
    ['autoequip', { reserve: true }],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'] }],

    // ---- Wutai
    ['obj', 'Sail west to Wutai'],
    ['world', 'wutai'],
    ['expectMap', 'wutai_outskirts'],
    ['walk', 16, 5, { done: 'c7_wq_stolen' }],                      // Yuffie takes all the materia; the Attack Squad
    ['expect', 'c7_wq_stolen'],
    ['party', ['cloud', 'cid', 'tifa']],                            // Yuffie's gone: a third member for the chase (and Rapps)
    ['autoequip', {}],
    ['obj', 'Catch Yuffie'],
    ['goto', 'wutai_town'],                                         // she runs off into town
    ['expect', 'c7_wq_town'],
    ['goto', 'wutai_turtle'],                                       // the Turks, on vacation
    ['goto', 'wutai_yuffie_house'],
    ['use', 17, 0, { done: 'c7_turtle_flyer6' }],                   // Turtle's Paradise flyer No.6
    ['chest', 'wutai_yhouse_mpabsorb'],                             // MP Absorb... snatched back at once
    ['walk', 10, 9, { done: 'c7_wq_mpabsorb' }],
    ['goto', 'wutai_items'],
    ['use', 3, 3, { done: 'c7_wq_screen' }],                        // sandals under the folding screen
    ['goto', 'wutai_town'],
    ['use', 34, 17, { done: 'c7_wq_pot' }],                         // the wobbling pot
    ['goto', 'wutai_yuffie_house'],
    ['use', 3, 2, { done: 'c7_wq_trap', choose: 'Pull it' }],       // the lever: a trap, of course
    ['goto', 'wutai_town'],                                         // Corneo carries off Yuffie and Elena
    ['expect', 'c7_wq_kidnap'],
    ['goto', 'wutai_town2'],
    ['use', 12, 9, { done: 'c7_wq_bell', choose: 'Ring it' }],      // the bell opens the storehouse
    ['goto', 'wutai_shrine'],                                       // Corneo's men
    ['expect', 'c7_wq_shrine'],
    ['chest', 'wutai_shrine_swiftbolt'],                            // Swift Bolt
    ['chest', 'wutai_shrine_elixir'],                               // Elixir
    ['goto', 'wutai_godo_house'],                                   // Godo's hidden rooms
    ['use', 4, 3, { done: at('wutai_godo_house', (x, y) => x <= 3 && y <= 2) }],
    ['chest', 'wutai_godo_shuriken'],                               // Magic Shuriken
    ['use', 4, 2, { done: at('wutai_godo_house', (x, y) => x >= 5) }],
    ['use', 29, 4, { done: at('wutai_godo_house', (x, y) => x >= 27 && y <= 2) }],
    ['chest', 'wutai_godo_hairpin'],                                // Hairpin
    ['use', 33, 1, { done: at('wutai_godo_house', (x, y) => y >= 5) }],
    ['goto', 'wutai_turtle'],
    ['talk', 'reno', { done: 'c7_wq_turks' }],                      // a truce with the Turks: Corneo is at Da-chao
    ['expect', 'c7_wq_turks'],
    ['obj', 'Climb Da-chao'],
    ['goto', 'wutai_dachao_cave'],
    ['chest', 'wutai_dachao_cave_dragoon_lance'],                   // Dragoon Lance
    ['autoequip', {}],                                              // (no materia until Rapps is beaten: the best weapons)
    ['goto', 'wutai_dachao_ledge'],
    ['save'],
    ['useItem', 'tent', 'cloud', { done: fresh }],
    ['ckpt', 'c7_rapps'],
    ['obj', 'Save Yuffie and Elena from Corneo'],
    ['goto', 'wutai_dachao_top'],                                   // Rapps (Peace Ring); the materia comes back
    ['expect', 'c7_wutai_done'],
    ['party', ['cloud', 'yuffie', 'cid']],                          // Yuffie is back
    ['autoequip', {}],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'] }],

    // ---- Wutai after the chase
    ['obj', 'Look around Wutai'],
    ['goto', 'wutai_cat_house'],
    ['chest', 'wutai_cat_hpabsorb'],                                // HP Absorb (the cats have moved)
    ['goto', 'wutai_weapons'],
    ['gear', { shop: 'shopkeeper', keepGil: 2000 }],
    ['goto', 'wutai_town'],
    ['use', 26, 18, { done: 'c7_turtle_sign' }],                    // the flyer contest sign
    ['goto', 'wutai_turtle'],
    ['talk', 'bartender', { done: 'c7_turtle_prize' }],             // six flyers: the Sources and a Megalixir
    ['expect', 'c7_turtle_prize', { soft: true }],

    ['c6b_sources', 'cloud'],                                       // the Sources (the flyer prize, the mansion, Rocket Town): Cloud

    // ---- the Pagoda (Yuffie alone against the Five Mighty Gods) is done in C12b.

    // ---- back to the Bronco; Magic Hammer (Razor Weed) on the grass outside Wutai. (Death Force: the
    // Adamantaimai live only on the island's far south beach, a long detour; left for later.)
    ['obj', 'Learn Magic Hammer outside Wutai'],
    ['autoequip', { reserve: true }],
    ['goto', 'world'],
    // a Razor Weed has to live long enough to be Manipulated: no attack magic, no All, MP saved
    ['loadout', 'yuffie', { weapon: ['manipulate', 'enemy_skill'], armor: [], clear: true }],
    ['loadout', 'cloud', { weapon: ['enemy_skill', 'restore'], armor: [], clear: true }],
    ['loadout', 'cid', { weapon: [], armor: [], clear: true }],
    ['battle', { mp: 'save' }],
    ['c6b_learn', ['magic_hammer'], { battles: 20, budget: 500000 }],   // Razor Weed, Manipulated
    ['battle', {}],
    ['autoMateria', { steal: 'yuffie', manipulate: 'yuffie', eskill: ['cloud', 'yuffie'] }],
    ['js', (s) => { s.set('c7_set_out'); return true; }],          // (the chapter's last step: a resume guard)
    ['expect', { any: ['c7_set_out', 'c8_gs_back'] }],              // the handoff (the Tiny Bronco: has_bronco)
    ['ckpt', 'c7_end'],
  ];
})();

// Themed trainer teams (the user's rule: no two trainers share a moogle). Every trainer, Team Hojo grunt, dojo master,
// Elite Four member and Crater elite gets a team built around who they are; the rivals get signature teams that grow
// meeting by meeting; the tournament pool's people get teams that fit them. Levels on the old scale (KP.LV).
(function () {
  const KP = FF7.kupomon;
  KP.content('trainers', {
    teams: {
      // ---------------------------------------------------------------- Region 1: Route 1 to Kurotsuki
      kp_tr_ollie: [['tufty_freelancer', 4], ['nibblemog_nut_nibbler', 4]],            // a Pomville kid's first moogles
      kp_tr_mabel: [['mopluff_bard', 5]],                                              // a cute dancer
      kp_r1n_rowan: [['recipom_camp_cook', 5], ['trekpom_tourist', 6]],               // camp cook and map-walker
      kp_r2_gil: [['angler_fisher', 6], ['lurepom_lure_caster', 7]],                   // the fishing pier
      kp_r2_hazel: [['farmmog_farmer', 6], ['woolpom_shepherd', 7]],                   // field and flock
      kp_r2_grunt1: [['phialmog_philterer', 7], ['mixikupo_mixer', 7]],                // Team Hojo: the potion lab
      kp_r2_grunt2: [['kutan_noisemaker', 7], ['chasemog_drone', 7], ['babilkin_drone', 8]],   // Team Hojo: test machines
      kp_r2_bram: [['burrowpom_moogle', 7], ['terrapom_dowser', 7]],                   // tunnels and rock
      kp_ww_fern: [['mogmont_archer', 7], ['vierkin_warden', 8]],                      // forest archers
      kp_ww_tim: [['honeykin_beekeeper', 7], ['piperpom_piper', 7]],                   // bees and wood critters
      kp_r2_wade: [['bubblin_snorkeler', 8]],
      kp_wwd_ash: [['huntmog_hunter', 9], ['torgamog_wolf_rider', 9]],                 // hunter and wolf
      kp_wwd_vin: [['filchpom_pickpocket', 9], ['lowpom_urchin', 10]],                 // light fingers
      kp_r3_kage: [['ratpom_thief', 9], ['mudrakin_ninja', 10]],                       // shadow ninja
      kp_r3_sato: [['banopom_orchard_hand', 9], ['shiropom_novice_healer', 9]],        // the paddies and orchards
      kp_r3_rei: [['tsubamog_ronin', 10], ['katanpom_pupil', 10]],                     // the bamboo grove's swordsmoogles
      kp_r3_ko: [['halomog_cleric', 10], ['mysimog_acolyte', 11]],                     // temple healers
      kp_dj_kaz: [['glaivemog_kingsglaive', 10], ['fangmog_novice', 10]],              // Shuriken Arcade pupils
      kp_dj_rin: [['mithpom_mithra_scout', 11], ['delvemog_delver', 11]],              // trap-setters for the trapdoor dojo
      kp_dj_suzu: [['eblakin_ninja', 11], ['katalmog_fighter', 11], ['tosspom_juggler', 12]],
      kp_yuffie: [['citrikin_w_commander', 13], ['nutmog_treasure_hunter', 14], ['kurogen_kunoichi', 16]],   // Thief: mug, loot, kunoichi
      // ---------------------------------------------------------------- Region 2: Route 4 to Mogfield
      kp_r4_flint: [['flintkin_fusilier', 11], ['selkipom_leuda_scamp', 12]],
      kp_r4_bosun: [['seamog_sailor', 12], ['vikmog_oarsman', 11], ['lumimog_lamplighter', 12]],   // a ship's crew and the lighthouse
      kp_r4_sandy: [['moguta_digger', 11], ['kupan_castaway', 13]],                    // treasure in the sand, a driftwood raft
      kp_r4_wade: [['farispom_rover', 12], ['rollmog_sea_dog', 12], ['puddlepom_rainmaker', 13]],
      kp_r5_twins: [['palopom_pupil', 13], ['minuemog_troubadour', 13]],               // twin halves, two songs at once
      kp_r5_lulu: [['puddipom_cook', 13], ['ladlemog_culinarian', 14]],               // a picnic
      kp_r5_gus: [['moombapom_moomba', 14], ['focumog_claw_knight', 14]],              // foothill climbers
      kp_r5_kesha: [['nibelpom_peak_guide', 14], ['condorpom_fort_lookout', 14]],
      kp_r5_rowan: [['cornemog_knight', 14], ['plumemog_red_wizard', 14], ['mendmog_white_wizard', 15]],   // the Light Warriors
      kp_mk_ivy: [['explorkin_monsterizer', 15], ['kamog_relic_master', 14]],
      kp_d2_gil: [['gizmog_inventor', 14], ['mogrich_engineer', 15]],
      kp_mk_stone: [['blitzpom_blitzer', 15], ['gaiapom_geomancer', 15]],
      kp_mk_grunt1: [['mogzun_blast_miner', 15], ['verdikin_materia_adept', 15]],      // Team Hojo: digging for mako crystals
      kp_mk_grunt2: [['brandmog_cieth', 15], ['miasmog_miasma_stream', 16]],           // Team Hojo: failed specimens
      kp_mk_scarlet: [['dreadmog_dreadnought', 15], ['vectomog_tek_armor', 16], ['clodkin_clod_pilot', 17]],   // weapons development
      kp_mk_kage: [['mogret_shadowblade', 15], ['umbramog_warrior', 16]],
      kp_mk_ozzie: [['kupek_narshe_guard', 15], ['suzuna_save', 15], ['momatose_napper', 16]],
      kp_d2_rosa: [['automog_puppetmaster', 15], ['steelmog_machinist', 15]],
      kp_d2_rigg: [['slumkin_junk_baron', 15], ['minemog_foreman', 16]],
      kp_r6_tobias: [['hatpom_timemage', 15], ['kuropom_mischief_mage', 15], ['pixipom_pupil', 15]],   // kid wizards
      kp_r6_dolly: [['rodeopom_cowpoke', 16], ['kwehpom_cavalier', 15]],
      kp_r6_hank: [['hedgepom_gardener', 15], ['mogmul_carpenter', 17]],
      kp_r6_mae: [['partypom_partygoer', 16], ['hearthmog_mog_gardener', 16]],
      kp_r6_edison: [['synthmog_synthesist', 16], ['crankpom_troubadour', 17]],
      r7_hob: [['caravamog_caravan_chief', 17], ['chicomog_chocoboy', 16]],
      kp_d2_barret: [['gearmog_engineer', 17], ['avamog_saboteur', 18], ['figamog_desert_prince', 18], ['gunmog_gun_arm', 20]],   // Machinist
      // ---------------------------------------------------------------- Region 3: Nibel Peaks to Skyport
      r7_brom: [['mogaru_sasquatch', 17], ['dawnmog_warrior', 17], ['deistmog_wyvern_knight', 18]],
      nd_aya: [['booyamog_duelist', 17], ['scalepom_holyfist', 17]],
      r7_kenji: [['knucklin_brawler', 18], ['luchapom_wrestler', 18]],
      r7_tilda: [['shredpom_sledder', 18], ['yukepom_shella_magus', 18]],
      r7_rhea: [['palamog_black_knight', 18], ['leapkin_dragoon', 18], ['feykin_caller', 19]],   // dark knight, dragoon, summoner
      nd_gorm: [['stampo_blackbelt', 18], ['kuku_rager', 18]],
      nd_lin: [['pagodamog_floor_guardian', 18], ['inkupo_stamp_master', 18], ['fabulin_monk', 19]],
      r8_dax: [['pikepom_wyvern_rider', 19], ['liltimog_lilty_lancer', 19]],
      r8_rosa: [['derbymog_s_class_racer', 19], ['gysamog_choco_digger', 20]],
      nd_tifa: [['yevomog_warrior_monk', 20], ['icemog_yeti', 21], ['kupozen_disciple', 21], ['kupochi_master', 23]],   // Monk
      r8_pip: [['relikin_digger', 20], ['libramog_scholar', 20]],
      r8_zahra: [['mapkin_wayfinder', 20], ['tangopom_sword_dancer', 20], ['dunemog_raider', 21]],
      ru_grunt0: [['pyremog_fiend', 20], ['gravekin_gravecaller', 21]],                // Team Hojo: the tomb's restless dead
      ru_grunt1: [['datapom_battle_analyst', 20], ['oddimog_scientist', 21]],          // Team Hojo: field research
      sk_grunt: [['sanctumog_primarch', 20], ['peepmog_sky_pilot', 21]],
      ru_kip: [['mogtrove_trove_keeper', 21], ['jackpom_lady_luck', 21]],
      ru_heidegger: [['riotmog_hound_captain', 21], ['barkupo_war_hound', 22], ['junopom_drum_major', 22], ['gougpom_giant', 23]],   // guard hounds and parades
      ru_grunt2: [['esperpom_esper_envoy', 21], ['drawpom_guardian', 21]],             // Team Hojo: summon extraction
      r9_rex: [['courikupo_road_rider', 22], ['kartmog_grand_prix_ace', 21]],
      r9_tobi: [['kitemog_flier', 21], ['vaultkin_hurdler', 21]],
      r9_dorian: [['bokupo_wind_warrior', 22], ['gilgamog_gilgamesh', 22], ['enkimog_enkidu', 21]],
      sd_wren: [['airkupo_helmsman', 21], ['skiffmog_airship_pilot', 22]],
      hq1_grunt1: [['tekkupo_magitek', 21], ['gambitkin_gambiteer', 21]],              // Team Hojo: HQ security
      hq1_grunt2: [['azurepom_immortal', 21], ['carnivamog_blue_mage', 21]],           // Team Hojo: monster-skill tests
      hq2_sci: [['draklin_director', 22], ['noulikin_sage', 22], ['picrokin_puzzle_sage', 21]],
      hq2_grunt3: [['puppetmog_puppeteer', 21], ['furymog_fury_mage', 21]],            // Team Hojo: dolls and puppets
      r9_nell: [['omenpom_doomsayer', 22], ['starkupo_star_arbiter', 22], ['cruxmog_seeress', 23]],
      sd_gus: [['cidkin_invincible', 22], ['hammerpom_regalia_pilot', 22]],
      sd_vex: [['mogpirate_sky_pirate', 22], ['falcomog_sky_ace', 22]],
      hq_hojo: [['chemmog_alchemist', 22], ['mimikin_manikin', 22], ['mimikupo_mimic', 22], ['truffkin_druid', 22], ['nethermog_netherseer', 23]],
      // ---------------------------------------------------------------- Region 4: Route 10 to the Coliseum
      r10_coral: [['wavekin_bodyboarder', 23], ['noramog_nora_hero', 23], ['aurochmog_blitz_ace', 22]],
      sd_cid: [['wyrmog_rider', 23], ['brigapom_air_marshal', 24], ['rocketpom_rocketeer', 24], ['lancemog_highwind', 26]],   // Dragoon
      r10_brine: [['blunderpom_fusilier', 24], ['hushmog_janitor', 23]],
      r10_daisy: [['polkapom_nameless', 23], ['carnimog_fireworker', 23], ['twirlmog_dancer', 24]],
      r10_gill: [['whiskmog_spearfisher', 24], ['octopom_octo_villain', 23], ['buoypom_coastguard', 24]],
      bd_lily: [['mogwin_seedseer', 24], ['gullmog_floral_fallal', 24]],
      bd_moss: [['fernwisp_dryad', 24], ['garipom_elder', 25], ['stackmog_stack_master', 24]],
      bd_iris: [['evokin_sage', 25], ['zodipom_caller', 25], ['kupuncle_solar_summoner', 25]],
      r11_morwen: [['bogmog_witch', 25], ['yinpom_augur', 25], ['strawmog_black_wizard', 26]],
      r11_fen: [['windikin_ranger', 26], ['dowskin_terramancer', 25], ['leashpom_beastlord', 25]],
      r11_agatha: [['ouijapom_medium', 26], ['ghostmog_specter', 25], ['bellboo_night_manager', 26]],
      bd_aeris: [['eidomog_holy', 26], ['avatamog_avatar_caller', 26], ['pilgrimog_high_summoner', 27], ['petalmog_maiden', 27], ['callmog_evoker', 29]],   // Summoner
      r11_rowan: [['lichmog_lich', 26], ['marimog_marilith', 26], ['krakmog_kraken', 26], ['tiamog_tiamat', 27]],   // the four Fiends
      rd_grimsby: [['dustbun_custodian', 26], ['clockmog_chrono', 26]],
      rd_corvin: [['thaumog_astral_archon', 27], ['tallypom_arithmancer', 26], ['hopekin_academy_head', 26]],
      r12_hiker: [['luopom_luopan_sage', 27], ['anvilmog_armorer', 26], ['valimog_mothercrystal', 27]],
      rd_lenore: [['phantomog_phantom_engine', 27], ['hummingpom_elder', 27], ['uneikin_devout', 27]],
      r12_orla: [['twinklin_skyseer', 27], ['nimbopom_meteorologist', 27], ['cosmopom_planet_elder', 27], ['amethymog_plus_adept', 28]],
      r12_kade: [['domamog_bushido_master', 28], ['runemog_runic_general', 27], ['kupop_phoenix_seeker', 27], ['mogu_dance_master', 27], ['sketchmog_portraitist', 27]],
      r12_pell: [['batmog_vampire', 27], ['spookmog_necromancer', 27], ['memokin_soul_breaker', 27]],
      r12_ives: [['riskpom_bloodsin', 27], ['gentimog_glacian', 28], ['hidepom_outlaw', 27]],
      ls_kessler: [['spheremog_sphere_master', 27], ['arkmog_ark_keeper', 27], ['omnipom_omnia_guide', 28]],
      ls_ivers: [['dogapom_magus', 27], ['odinmog_raiden', 28], ['prismkin_imprismer', 27]],
      kl_elena: [['mogpost_cannoneer', 27], ['mogbow_bowblade', 27], ['bountymog_hunt_captain', 27], ['fletchmog_sniper', 28]],   // Ranger
      rd_vincent: [['mozme_noble', 28], ['orbmog_seer', 28], ['galimog_galian', 29], ['mathmog_arithmetician', 29], ['tickmog_chronomancer', 30]],   // Time Mage
      r13_gunnar: [['deckmog_forward', 28], ['serino_general', 28], ['crusapom_crusader', 28], ['bravelin_cosmos_champion', 29]],
      r13_mira: [['seedmog_commander', 28], ['scarmog_knight', 28], ['triadmog_queen', 28], ['crampmog_president', 28]],
      r13_jonah: [['monty_master', 28], ['moorock_villager', 28], ['moodon_captain', 28], ['mopli_dragoon', 28], ['mocha_gourmand', 28]],
      su_ox: [['dojopom_master', 28], ['sumopom_yokozuna', 28], ['chakrapom_rhalgr', 29], ['grandkupo_grandmaster', 28]],
      su_selene: [['faythpom_aeon', 29], ['hornpom_ronso_guardian', 28], ['waltzkin_songstress', 29], ['suukma_machina_master', 28], ['zanmog_yojimbo', 28]],
      su_tobias: [['lawkin_magister', 29], ['nono_chief', 29], ['gridpom_master', 28], ['markpom_hunter', 28], ['quickpom_quickener', 29]],
      kl_reno: [['voltkin_stormcaller', 28], ['sootkin_pyromancer', 28], ['chillkin_elementalist', 28], ['embermog_archmage', 28]],   // Black Mage
      kl_rude: [['arenakupo_square_champion', 28], ['oinkpom_pitboss', 28], ['chopkin_ravager', 28], ['kenkupo_sword_saint', 29], ['bustermog_first_class', 29]],   // Warrior
      su_hale: [['aegimog_holy_knight', 29], ['brawnpom_defender', 29], ['mogpendragon_paladin', 29], ['wallmog_old_wall', 29], ['shellmog_guardian', 29]],
      su_sasha: [['duskmog_dark_knight', 29], ['bulletpom_gunbreaker', 29], ['vermog_red_mage', 29], ['pictopom_painter', 29], ['reapom_reaper', 30]],
      su_wyn: [['wyverkin_dragonkin', 29], ['mistpuff_dragon', 29], ['skykupo_sky_sovereign', 30], ['oerbamog_pulse_lancer', 29]],
      r14_rhea: [['mirromog_paladin', 29], ['spoonymog_prince', 29], ['whalekupo_whale', 29], ['asurakin_queen', 29], ['baronmog_commander', 30]],
      r14_dorian: [['moorkin_void_warlock', 30], ['shardkupo_warden', 29], ['tamemog_beast_lord', 29], ['zenipom_samurai', 29], ['voidkupo_herald', 29]],
      r14_lux: [['lightpom_etro_knight', 30], ['warpmog_true_king', 29], ['amicimog_kings_shield', 29], ['promptopom_sharpshooter', 29], ['zeromog_agito', 30]],
      kl_tseng: [['darkmog_knight', 29], ['elvamog_royal_paladin', 29], ['linkpom_counter_knight', 29], ['mogsquire_paladin', 30], ['leomog_gunbreaker', 30]],   // Knight
      // ---------------------------------------------------------------- post-league: the Northern Crater and Mognet Tower
      cr_morrigan: [['kefkupo_mad_god', 30], ['sorcepom_time', 30], ['mechmog_warmech', 30], ['runekin_mystic_knight', 30], ['serendimog_croupier', 30]],
      cr_castor: [['astropom_lunarian', 30], ['tarupom_star_sibyl', 30], ['riposto_rune_knight', 30], ['seramog_seraph', 30], ['rubimog_round_herald', 30]],
      cr_ulric: [['mogwolf_sea_wolf', 30], ['grumog_viking', 30], ['hawkin_raptor', 30], ['chocomog_knight', 30], ['mossmog_beastmaster', 30]],
      mg_pip: [['mogki_courier', 30], ['kupokid_mog_merchant', 30], ['lapimog_trust_keeper', 30], ['chatmog_orator', 30]],
      mg_dot: [['mogsuit_mascot', 30], ['kupage_mog_knight', 30], ['pomlance_knight', 30], ['nestlin_nest_elder', 30], ['pocketmog_pet', 30]],
    },
    rivals: {
      zack: {
        1: [['STARTER', 5]],
        2: [['STARTER', 9], ['bustermog_trooper', 8]],
        4: [['STARTER', 15], ['bustermog_trooper', 14], ['barkupo_guard_pup', 14]],
        7: [['STARTER', 23], ['bustermog_soldier', 22], ['barkupo_war_hound', 22], ['wingmog_white_wing', 21]],
        9: [['STARTER', 29], ['bustermog_first_class', 28], ['barkupo_war_hound', 28], ['wingmog_white_wing', 28], ['clavamog_clavat_hero', 27]],
        champion: [['bustermog_first_class', 30], ['barkupo_war_hound', 30], ['wingmog_white_wing', 30], ['clavamog_clavat_hero', 30], ['STARTER', 30]],
      },
      sephiroth: {
        3: [['katanpom_pupil', 11], ['STARTER', 12]],
        5: [['katanpom_kensei', 16], ['lucamog_stonebearer', 16], ['STARTER', 17]],
        6: [['gentimog_glacian', 20], ['katanpom_kensei', 21], ['lucamog_templar', 21], ['STARTER', 22]],
        8: [['astropom_astronaut', 26], ['gentimog_glacian', 26], ['katanpom_kensei', 27], ['lucamog_lucavi', 27], ['STARTER', 28]],
        champion: [['astropom_lunarian', 30], ['gentimog_glacian', 30], ['katanpom_kensei', 30], ['lucamog_lucavi', 30], ['STARTER', 30]],
        league: [['astropom_lunarian', 30, { plus: 3 }], ['gentimog_glacian', 30, { plus: 3 }], ['katanpom_kensei', 30, { plus: 3, held: 'focus_pom' }], ['lucamog_lucavi', 30, { plus: 3, held: 'quick_gear' }], ['STARTER', 30, { plus: 3, held: 'leftover_nut' }]],
      },
    },
    pool: {
      'Red XIII': ['torgamog_pup_keeper', 'garipom_maskbearer', 'barkupo_guard_pup', 'mossmog_geomancer', 'kuku_veldt_pup'],
      'Reno': ['spykin_spy', 'voltkin_electrician', 'nutmog_thief', 'filchpom_pickpocket', 'batmog_stalker'],
      'Rude': ['knucklin_brawler', 'sumopom_sumo', 'brawnpom_bouncer', 'stampo_monk', 'luchapom_wrestler'],
      'Elena': ['flintkin_fusilier', 'fletchmog_archer', 'huntmog_hunter', 'bountymog_bounty_hunter', 'steelmog_gunsmith'],
      'Dio': ['arenakupo_arena_rookie', 'bigtopo_ringmaster', 'derbymog_jockey', 'cactpom_host', 'stitchpom_leatherworker'],
      'Don Corneo': ['glamkupo_backup_dancer', 'daravpom_lecturer', 'gilmog_gambler', 'zozopom_fibber', 'mozme_shark'],
      'Yuffie': ['kurogen_genin', 'citrikin_mugger', 'verdikin_materia_bud', 'mudrakin_rogue', 'eblakin_pupil'],
      'Barret': ['gunmog_gunner', 'avamog_lookout', 'slumkin_scavenger', 'minemog_miner', 'gearmog_tinker'],
      'Tifa': ['kupochi_pugilist', 'icemog_climber', 'dojopom_monk', 'kupozen_initiate', 'chakrapom_fistfighter'],
      'Cid': ['lancemog_lancer', 'cidkin_rigger', 'airkupo_deckhand', 'kitemog_flier', 'ragnamog_cadet'],
      'Scarlet': ['clodkin_arms_tester', 'dreadmog_riveter', 'vectomog_tek_pilot', 'tekkupo_magitek', 'mechmog_warmech'],
      'Heidegger': ['riotmog_shinra_mp', 'junopom_parade_cadet', 'gougpom_giant', 'chasemog_drone', 'seamog_sailor'],
      'Reeve': ['plushmog_plushie', 'wallmog_wall_sentry', 'mogsuit_mascot', 'dustbun_sweeper', 'automog_harlequin'],
      'Aeris': ['petalmog_florist', 'halomog_cleric', 'eidomog_pet', 'mogwin_conjurer', 'avatamog_avatar_caller'],
      'Vincent': ['galimog_werebeast', 'duskmog_shadowsworn', 'ghostmog_phantom', 'umbramog_page', 'gravekin_gravedigger'],
      'Rufus': ['lawkin_cadet', 'leomog_gunbreaker', 'bulletpom_cadet', 'darkmog_squire', 'warpmog_warp_striker'],
      'Bugenhagen': ['cosmopom_candle_keeper', 'twinklin_stargazer', 'relikin_digger', 'memokin_archivist', 'hummingpom_dweller'],
      'Dyne': ['hushmog_guard', 'gullmog_pistoleer', 'blunderpom_gunner', 'markpom_hunter', 'suukma_sand_digger'],
      'Tseng': ['glaivemog_glaive_recruit', 'mogret_sellsword', 'amicimog_crownsguard', 'elvamog_royal_page', 'kupek_watchman'],
      'Palmer': ['astropom_space_cadet', 'rocketpom_launch_tech', 'nimbopom_forecaster', 'puddipom_cook', 'telekupo_sky_courier'],
      'Hojo': ['chemmog_chemist', 'draklin_chemist', 'oddimog_assistant', 'mimikin_manikin', 'brandmog_lcie'],
      'Prof. Sith': ['mogmk_mk1', 'moglin_warrior', 'kupwick_blackmage', 'pomsprout_whitemage', 'kupage_page'],
      'Biggs': ['noramog_sentinel', 'kumop_returner', 'rosekin_recruit', 'crusapom_recruit', 'vikmog_oarsman'],
      'Wedge': ['ladlemog_kitchen_hand', 'recipom_camp_cook', 'partypom_partygoer', 'kennymog_diner_mascot', 'hearthmog_housekeeper'],
      'Jessie': ['gizmog_inventor', 'operapom_understudy', 'kutan_noisemaker', 'crankpom_tinker', 'synthmog_material_hunter'],
      'President Shinra': ['execmog_intern', 'phialmog_philterer', 'kupokid_mog_kid', 'sanctumog_psicom', 'babilkin_drone'],
      'Shera': ['nono_tinker', 'mogrich_hand', 'skiffmog_rigger', 'starkupo_card_reader', 'buoypom_lifeguard'],
      'Godo': ['pagodamog_pagoda_pupil', 'tsubamog_ronin', 'kenkupo_wanderer', 'zanmog_hired_blade', 'wyverkin_wyvern_keeper'],
      'Elmyra': ['hedgepom_gardener', 'nestlin_nest_tender', 'breezlin_miller', 'shiropom_novice_healer', 'lapimog_town_greeter'],
    },
  });
})();

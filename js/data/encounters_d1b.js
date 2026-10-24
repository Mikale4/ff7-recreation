// FF7 encounter tables - Disc 1, part B (Kalm flashback ... Forgotten Capital).
// Formations and odds from the Enemy Mechanics FAQ (section 3.2). w = % chance of the formation.
// Tables named after a region combine every terrain of that region with equal share; the
// *_grass / *_beach / ... and per-screen variants give the exact per-terrain / per-screen odds.
// Back / side / pincer battles keep their FF7 absolute chance (x/64); normal battles share the rest.
// Extra formation flags (as in encounters_d1a.js): noEscape, rows, groups; plus noRewards (FF7 gives
// no EXP/AP/gil/items: Kalm flashback) and noGameOver (Pagoda duels: losing is not a game over).
// Where each table is used: docs/enemies_d1b.md.
Object.assign(FF7.data.encounters, {
  // ===== Kalm flashback - Mt. Nibel five years ago (no spoils in FF7) =====
  flashback_nibel: [
    { e: ['kyuvilduns', 'kyuvilduns'], w: 7, noRewards: true },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 7, noRewards: true },
    { e: ['sonic_speed', 'kyuvilduns', 'kyuvilduns'], w: 6, noRewards: true },
    { e: ['sonic_speed', 'sonic_speed'], w: 5, noRewards: true },
    { e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 32, noRewards: true },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 9, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 17, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 7, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'sonic_speed'], w: 9, noRewards: true }
  ],
  flashback_nibel_path: [
    { e: ['kyuvilduns', 'kyuvilduns'], w: 28, noRewards: true },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 27, noRewards: true },
    { e: ['sonic_speed', 'kyuvilduns', 'kyuvilduns'], w: 23, noRewards: true },
    { e: ['sonic_speed', 'sonic_speed'], w: 22, noRewards: true }
  ],
  flashback_nibel_bridge: [{ e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 100, noRewards: true }],
  flashback_nibel_cave: [
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 38, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 34, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 28, noRewards: true }
  ],
  flashback_nibel_reactor: [
    { e: ['twin_brain', 'twin_brain', 'sonic_speed'], w: 38, noRewards: true },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 34, noRewards: true },
    { e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 28, noRewards: true }
  ],

  // ===== Costa del Sol region (FF7 "Corel Area" grass + beach) =====
  wm_costa: [
    { e: ['grangalan'], w: 63 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 13 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 13 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 13, type: 'side' }
  ],
  wm_costa_grass: [{ e: ['grangalan'], w: 100 }],
  wm_costa_beach: [
    { e: ['grangalan'], w: 25 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 25 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 25 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 25, type: 'side' }
  ],

  // ===== Mt. Corel =====
  mt_corel: [
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss'], w: 5 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'needle_kiss'], w: 5 },
    { e: ['needle_kiss', 'search_crown', 'bagnadrana'], w: 4 },
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss'], w: 2, type: 'back' },
    { e: ['bloatfloat', 'bloatfloat', 'bloatfloat'], w: 5 },
    { e: ['bagnadrana', 'bagnadrana'], w: 4 },
    { e: ['bloatfloat', 'bloatfloat', 'bloatfloat', 'bloatfloat'], w: 4 },
    { e: ['bloatfloat', 'bagnadrana', 'bloatfloat'], w: 4 },
    { e: ['bomb'], w: 18 },
    { e: ['bomb', 'bomb'], w: 4 },
    { e: ['cokatolis', 'bloatfloat', 'bloatfloat'], w: 4 },
    { e: ['cokatolis', 'cokatolis'], w: 4 },
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss', 'cokatolis'], w: 15 },
    { e: ['cokatolis'], w: 1, type: 'back' },
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss', 'needle_kiss', 'needle_kiss'], w: 1, type: 'pincer' },
    { e: ['search_crown', 'search_crown', 'search_crown', 'search_crown', 'search_crown'], w: 5 },
    { e: ['needle_kiss', 'needle_kiss', 'bagnadrana'], w: 5 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'needle_kiss', 'needle_kiss'], w: 4 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'search_crown', 'search_crown'], w: 2, type: 'side' },
    { e: ['cokatolis', 'cokatolis', 'cokatolis'], w: 3, type: 'pincer' }
  ],
  mt_corel_path: [
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss'], w: 33 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'needle_kiss'], w: 30 },
    { e: ['needle_kiss', 'search_crown', 'bagnadrana'], w: 25 },
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss'], w: 13, type: 'back' }
  ],
  mt_corel_reactor: [
    { e: ['bloatfloat', 'bloatfloat', 'bloatfloat'], w: 28 },
    { e: ['bagnadrana', 'bagnadrana'], w: 27 },
    { e: ['bloatfloat', 'bloatfloat', 'bloatfloat', 'bloatfloat'], w: 23 },
    { e: ['bloatfloat', 'bagnadrana', 'bloatfloat'], w: 22 }
  ],
  mt_corel_bridge_start: [
    { e: ['bomb'], w: 28 },
    { e: ['bomb', 'bomb'], w: 27 },
    { e: ['cokatolis', 'bloatfloat', 'bloatfloat'], w: 23 },
    { e: ['cokatolis', 'cokatolis'], w: 22 }
  ],
  mt_corel_tracks: [
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss', 'cokatolis'], w: 88 },
    { e: ['cokatolis'], w: 6, type: 'back' },
    { e: ['needle_kiss', 'needle_kiss', 'needle_kiss', 'needle_kiss', 'needle_kiss'], w: 6, type: 'pincer' }
  ],
  mt_corel_waterside: [
    { e: ['search_crown', 'search_crown', 'search_crown', 'search_crown', 'search_crown'], w: 33 },
    { e: ['needle_kiss', 'needle_kiss', 'bagnadrana'], w: 30 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'needle_kiss', 'needle_kiss'], w: 25 },
    { e: ['search_crown', 'search_crown', 'search_crown', 'search_crown', 'search_crown'], w: 13, type: 'side' }
  ],
  mt_corel_rail_bridge: [
    { e: ['bomb'], w: 81 },
    { e: ['cokatolis', 'cokatolis', 'cokatolis'], w: 19, type: 'pincer' }
  ],

  // ===== North Corel region (FF7 "Corel Area" mountain path) =====
  wm_corel: [
    { e: ['grangalan'], w: 21 },
    { e: ['needle_kiss', 'needle_kiss'], w: 21 },
    { e: ['cokatolis', 'needle_kiss', 'needle_kiss'], w: 21 },
    { e: ['needle_kiss', 'needle_kiss'], w: 13, type: 'back' },
    { e: ['needle_kiss', 'needle_kiss'], w: 25, type: 'side' }
  ],

  // ===== Corel Prison & Corel Desert =====
  corel_prison: [
    { e: ['2_faced', 'bandit', 'bandit'], w: 33 },
    { e: ['2_faced', '2_faced', 'bandit'], w: 30 },
    { e: ['2_faced', '2_faced', '2_faced'], w: 25 },
    { e: ['bandit', 'bandit'], w: 13, type: 'pincer' }
  ],
  corel_prison_well: [{ e: ['2_faced', '2_faced', '2_faced', '2_faced'], w: 100 }],
  corel_prison_outskirts: [
    { e: ['death_claw', 'death_claw'], w: 28 },
    { e: ['bullmotor', 'bullmotor', 'bullmotor', 'bullmotor'], w: 27 },
    { e: ['death_claw', 'death_claw', 'bullmotor'], w: 23 },
    { e: ['2_faced', 'bandit', 'bandit'], w: 22 }
  ],
  corel_prison_junkyard: [
    { e: ['death_claw', 'death_claw'], w: 28 },
    { e: ['bullmotor', 'bullmotor', 'bullmotor', 'bullmotor'], w: 27 },
    { e: ['death_claw', 'death_claw', 'bullmotor'], w: 23 },
    { e: ['2_faced', '2_faced', 'bandit'], w: 22 }
  ],
  corel_desert: [
    { e: ['land_worm'], w: 94 },
    { e: ['cactuar'], w: 6 }
  ],

  // ===== Gold Saucer region / desert edge (world map) =====
  wm_desert_edge: [
    { e: ['spencer', 'spencer', 'spencer', 'flapbeat'], w: 10 },
    { e: ['flapbeat', 'flapbeat', 'flapbeat'], w: 10 },
    { e: ['joker', 'joker'], w: 10 },
    { e: ['joker', 'flapbeat', 'flapbeat'], w: 4, type: 'back' },
    { e: ['harpy'], w: 17 },
    { e: ['flapbeat', 'flapbeat', 'flapbeat', 'flapbeat'], w: 17 },
    { e: ['grangalan'], w: 8 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 17 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 8 }
  ],
  wm_desert_edge_grass: [
    { e: ['spencer', 'spencer', 'spencer', 'flapbeat'], w: 30 },
    { e: ['flapbeat', 'flapbeat', 'flapbeat'], w: 29 },
    { e: ['joker', 'joker'], w: 29 },
    { e: ['joker', 'flapbeat', 'flapbeat'], w: 13, type: 'back' }
  ],
  wm_desert_edge_desert: [
    { e: ['harpy'], w: 50 },
    { e: ['flapbeat', 'flapbeat', 'flapbeat', 'flapbeat'], w: 50 }
  ],
  wm_desert_edge_beach: [
    { e: ['grangalan'], w: 25 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 50 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 25 }
  ],

  // ===== Gongaga region (world map), jungle & reactor =====
  wm_gongaga: [
    { e: ['grand_horn'], w: 10 },
    { e: ['gagighandi', 'gagighandi'], w: 19 },
    { e: ['grand_horn', 'grand_horn'], w: 10 },
    { e: ['grand_horn'], w: 2, type: 'back' },
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 2, type: 'pincer' },
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 10 },
    { e: ['gagighandi', 'touch_me', 'touch_me'], w: 10 },
    { e: ['touch_me', 'touch_me', 'touch_me', 'touch_me', 'touch_me', 'touch_me'], w: 4, type: 'pincer' },
    { e: ['grangalan'], w: 8 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 17 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 8 }
  ],
  wm_gongaga_grass: [
    { e: ['grand_horn'], w: 30 },
    { e: ['gagighandi', 'gagighandi'], w: 29 },
    { e: ['grand_horn', 'grand_horn'], w: 29 },
    { e: ['grand_horn'], w: 6, type: 'back' },
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 6, type: 'pincer' }
  ],
  wm_gongaga_jungle: [
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 30 },
    { e: ['gagighandi', 'gagighandi'], w: 29 },
    { e: ['gagighandi', 'touch_me', 'touch_me'], w: 29 },
    { e: ['touch_me', 'touch_me', 'touch_me', 'touch_me', 'touch_me', 'touch_me'], w: 13, type: 'pincer' }
  ],
  wm_gongaga_beach: [
    { e: ['grangalan'], w: 25 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug'], w: 50 },
    { e: ['beach_plug', 'beach_plug', 'beach_plug', 'beach_plug'], w: 25 }
  ],
  gongaga: [
    { e: ['kimara_bug'], w: 25 },
    { e: ['touch_me'], w: 26 },
    { e: ['kimara_bug', 'kimara_bug'], w: 23 },
    { e: ['touch_me', 'touch_me'], w: 6, type: 'pincer' },
    { e: ['flower_prong'], w: 12 },
    { e: ['flower_prong'], w: 6, type: 'side' }
  ],
  gongaga_jungle_1: [
    { e: ['kimara_bug'], w: 32 },
    { e: ['touch_me'], w: 30 },
    { e: ['kimara_bug', 'kimara_bug'], w: 26 },
    { e: ['touch_me', 'touch_me'], w: 13, type: 'pincer' }
  ],
  gongaga_jungle_2: [
    { e: ['flower_prong'], w: 25 },
    { e: ['touch_me'], w: 23 },
    { e: ['kimara_bug', 'kimara_bug'], w: 21 },
    { e: ['kimara_bug'], w: 19 },
    { e: ['flower_prong'], w: 13, type: 'side' }
  ],
  gongaga_reactor: [
    { e: ['heavy_tank'], w: 88 },
    { e: ['heavy_tank'], w: 13, type: 'back' }
  ],

  // ===== Cosmo Canyon region (world map) & Cave of the Gi =====
  wm_cosmo: [
    { e: ['grand_horn'], w: 8 },
    { e: ['gagighandi', 'gagighandi'], w: 7 },
    { e: ['grand_horn', 'grand_horn'], w: 7 },
    { e: ['grand_horn'], w: 2, type: 'back' },
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 2, type: 'pincer' },
    { e: ['bagrisk', 'bagrisk', 'bagrisk'], w: 8 },
    { e: ['griffin'], w: 10 },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 10 },
    { e: ['bagrisk', 'bagrisk', 'bagrisk'], w: 3, type: 'back' },
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 3 },
    { e: ['golem'], w: 3 },
    { e: ['skeeskee', 'skeeskee', 'griffin'], w: 3 },
    { e: ['desert_sahagin', 'desert_sahagin', 'desert_sahagin'], w: 3 },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 1, type: 'back' },
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 1, type: 'back' },
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 4, type: 'side' },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 2, type: 'pincer' },
    { e: ['crown_lance', 'crown_lance'], w: 8 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 7 },
    { e: ['crown_lance'], w: 7 },
    { e: ['crown_lance', 'crown_lance'], w: 3, type: 'pincer' }
  ],
  wm_cosmo_grass: [
    { e: ['grand_horn'], w: 30 },
    { e: ['gagighandi', 'gagighandi'], w: 29 },
    { e: ['grand_horn', 'grand_horn'], w: 29 },
    { e: ['grand_horn'], w: 6, type: 'back' },
    { e: ['gagighandi', 'gagighandi', 'gagighandi'], w: 6, type: 'pincer' }
  ],
  wm_cosmo_dirt: [
    { e: ['bagrisk', 'bagrisk', 'bagrisk'], w: 30 },
    { e: ['griffin'], w: 29 },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 29 },
    { e: ['bagrisk', 'bagrisk', 'bagrisk'], w: 13, type: 'back' }
  ],
  wm_cosmo_canyon: [
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 12 },
    { e: ['griffin'], w: 12 },
    { e: ['golem'], w: 12 },
    { e: ['skeeskee', 'skeeskee', 'griffin'], w: 12 },
    { e: ['desert_sahagin', 'desert_sahagin', 'desert_sahagin'], w: 11 },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 11 },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 3, type: 'back' },
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 3, type: 'back' },
    { e: ['skeeskee', 'skeeskee', 'skeeskee'], w: 16, type: 'side' },
    { e: ['desert_sahagin', 'desert_sahagin'], w: 6, type: 'pincer' }
  ],
  wm_cosmo_beach: [
    { e: ['crown_lance', 'crown_lance'], w: 30 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 29 },
    { e: ['crown_lance'], w: 29 },
    { e: ['crown_lance', 'crown_lance'], w: 13, type: 'pincer' }
  ],
  cave_of_gi: [
    { e: ['heg', 'heg', 'heg', 'heg'], w: 13 },
    { e: ['sneaky_step'], w: 11 },
    { e: ['heg', 'heg', 'sneaky_step'], w: 15 },
    { e: ['sneaky_step', 'sneaky_step', 'sneaky_step'], w: 11 },
    { e: ['sneaky_step', 'sneaky_step'], w: 10 },
    { e: ['heg', 'heg', 'heg', 'heg', 'heg'], w: 14 },
    { e: ['sneaky_step', 'sneaky_step'], w: 6, type: 'back' },
    { e: ['sneaky_step', 'heg', 'heg', 'heg'], w: 7 },
    { e: ['gi_spector'], w: 7 },
    { e: ['sneaky_step', 'sneaky_step'], w: 4, type: 'side' },
    { e: ['gi_spector', 'gi_spector'], w: 2, type: 'pincer' }
  ],
  cave_of_gi_1: [
    { e: ['heg', 'heg', 'heg', 'heg'], w: 38 },
    { e: ['sneaky_step'], w: 34 },
    { e: ['heg', 'heg', 'sneaky_step'], w: 28 }
  ],
  cave_of_gi_2: [
    { e: ['sneaky_step', 'sneaky_step', 'sneaky_step'], w: 33 },
    { e: ['sneaky_step', 'sneaky_step'], w: 30 },
    { e: ['heg', 'heg', 'heg', 'heg', 'heg'], w: 25 },
    { e: ['sneaky_step', 'sneaky_step'], w: 13, type: 'back' }
  ],
  cave_of_gi_3: [
    { e: ['sneaky_step', 'heg', 'heg', 'heg'], w: 21 },
    { e: ['gi_spector'], w: 20 },
    { e: ['heg', 'heg', 'sneaky_step'], w: 18 },
    { e: ['heg', 'heg', 'heg', 'heg', 'heg'], w: 16 },
    { e: ['sneaky_step', 'sneaky_step'], w: 6, type: 'back' },
    { e: ['sneaky_step', 'sneaky_step'], w: 13, type: 'side' },
    { e: ['gi_spector', 'gi_spector'], w: 6, type: 'pincer' }
  ],

  // ===== Nibelheim region (world map), Shinra Mansion, Mt. Nibel =====
  wm_nibel: [
    { e: ['nibel_wolf', 'nibel_wolf'], w: 10 },
    { e: ['valron', 'nibel_wolf', 'nibel_wolf'], w: 10 },
    { e: ['valron'], w: 10 },
    { e: ['nibel_wolf', 'nibel_wolf'], w: 4, type: 'back' },
    { e: ['bahba_velamyu', 'bahba_velamyu'], w: 10 },
    { e: ['battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'valron'], w: 10 },
    { e: ['battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'battery_cap'], w: 10 },
    { e: ['bahba_velamyu', 'bahba_velamyu'], w: 4, type: 'pincer' },
    { e: ['crown_lance', 'crown_lance'], w: 10 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 10 },
    { e: ['crown_lance'], w: 10 },
    { e: ['crown_lance', 'crown_lance'], w: 4, type: 'pincer' }
  ],
  wm_nibel_grass: [
    { e: ['nibel_wolf', 'nibel_wolf'], w: 30 },
    { e: ['valron', 'nibel_wolf', 'nibel_wolf'], w: 29 },
    { e: ['valron'], w: 29 },
    { e: ['nibel_wolf', 'nibel_wolf'], w: 13, type: 'back' }
  ],
  wm_nibel_forest: [
    { e: ['bahba_velamyu', 'bahba_velamyu'], w: 30 },
    { e: ['battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'valron'], w: 29 },
    { e: ['battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'battery_cap', 'battery_cap'], w: 29 },
    { e: ['bahba_velamyu', 'bahba_velamyu'], w: 13, type: 'pincer' }
  ],
  wm_nibel_beach: [
    { e: ['crown_lance', 'crown_lance'], w: 30 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 29 },
    { e: ['crown_lance'], w: 29 },
    { e: ['crown_lance', 'crown_lance'], w: 13, type: 'pincer' }
  ],
  nibelheim_mansion: [
    { e: ['dorky_face', 'dorky_face', 'dorky_face'], w: 13 },
    { e: ['dorky_face', 'dorky_face', 'dorky_face', 'dorky_face'], w: 19 },
    { e: ['ghirofelgo'], w: 29 },
    { e: ['mirage', 'mirage', 'dorky_face'], w: 7 },
    { e: ['jersey', 'jersey', 'jersey'], w: 6 },
    { e: ['ghirofelgo'], w: 2, type: 'back' },
    { e: ['jersey', 'mirage', 'mirage'], w: 4, type: 'pincer' },
    { e: ['dorky_face', 'dorky_face', 'black_bat'], w: 10 },
    { e: ['dorky_face', 'mirage', 'dorky_face'], w: 8 },
    { e: ['black_bat', 'black_bat', 'black_bat'], w: 2, type: 'back' }
  ],
  nibelheim_mansion_1f: [
    { e: ['dorky_face', 'dorky_face', 'dorky_face'], w: 38 },
    { e: ['dorky_face', 'dorky_face', 'dorky_face', 'dorky_face'], w: 34 },
    { e: ['ghirofelgo'], w: 28 }
  ],
  nibelheim_mansion_2f: [
    { e: ['ghirofelgo'], w: 25 },
    { e: ['dorky_face', 'dorky_face', 'dorky_face', 'dorky_face'], w: 23 },
    { e: ['mirage', 'mirage', 'dorky_face'], w: 21 },
    { e: ['jersey', 'jersey', 'jersey'], w: 19 },
    { e: ['ghirofelgo'], w: 6, type: 'back' },
    { e: ['jersey', 'mirage', 'mirage'], w: 6, type: 'pincer' }
  ],
  nibelheim_mansion_stairs: [
    { e: ['ghirofelgo'], w: 33 },
    { e: ['dorky_face', 'dorky_face', 'black_bat'], w: 30 },
    { e: ['dorky_face', 'mirage', 'dorky_face'], w: 25 },
    { e: ['black_bat', 'black_bat', 'black_bat'], w: 6, type: 'back' },
    { e: ['jersey', 'mirage', 'mirage'], w: 6, type: 'pincer' }
  ],
  nibelheim_mansion_basement: [
    { e: ['black_bat', 'black_bat'], w: 21 },
    { e: ['black_bat', 'black_bat', 'black_bat'], w: 19 },
    { e: ['black_bat', 'black_bat', 'black_bat', 'black_bat'], w: 18 },
    { e: ['ying', 'yang'], w: 30 },
    { e: ['black_bat', 'black_bat', 'black_bat'], w: 3, type: 'back' },
    { e: ['ying', 'yang'], w: 3, type: 'back' },
    { e: ['black_bat', 'black_bat', 'black_bat'], w: 6, type: 'pincer' }
  ],
  mt_nibel: [
    { e: ['kyuvilduns', 'kyuvilduns'], w: 5 },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 4 },
    { e: ['sonic_speed', 'kyuvilduns', 'kyuvilduns'], w: 4 },
    { e: ['sonic_speed', 'sonic_speed'], w: 9 },
    { e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 15 },
    { e: ['zuu'], w: 13 },
    { e: ['sonic_speed', 'sonic_speed'], w: 2, type: 'pincer' },
    { e: ['twin_brain', 'twin_brain', 'sonic_speed'], w: 11 },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 14 },
    { e: ['screamer', 'twin_brain', 'screamer'], w: 7 },
    { e: ['screamer', 'screamer'], w: 3, type: 'back' },
    { e: ['screamer', 'screamer'], w: 1, type: 'pincer' },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 5 },
    { e: ['twin_brain', 'twin_brain', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 4 },
    { e: ['dragon'], w: 4 }
  ],
  mt_nibel_path: [
    { e: ['kyuvilduns', 'kyuvilduns'], w: 28 },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 27 },
    { e: ['sonic_speed', 'kyuvilduns', 'kyuvilduns'], w: 23 },
    { e: ['sonic_speed', 'sonic_speed'], w: 22 }
  ],
  mt_nibel_bridge: [
    { e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 33 },
    { e: ['sonic_speed', 'sonic_speed'], w: 30 },
    { e: ['zuu'], w: 25 },
    { e: ['sonic_speed', 'sonic_speed'], w: 13, type: 'pincer' }
  ],
  mt_nibel_reactor: [
    { e: ['twin_brain', 'twin_brain', 'sonic_speed'], w: 21 },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 20 },
    { e: ['sonic_speed', 'sonic_speed', 'sonic_speed'], w: 19 },
    { e: ['zuu'], w: 17 },
    { e: ['screamer', 'twin_brain', 'screamer'], w: 14 },
    { e: ['screamer', 'screamer'], w: 6, type: 'back' },
    { e: ['screamer', 'screamer'], w: 2, type: 'pincer' }
  ],
  mt_nibel_cave: [
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 28 },
    { e: ['twin_brain', 'twin_brain', 'twin_brain'], w: 27 },
    { e: ['twin_brain', 'twin_brain', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 23 },
    { e: ['dragon'], w: 22 }
  ],

  // ===== Rocket Town region (world map) =====
  wm_rocket: [
    { e: ['nibel_wolf', 'nibel_wolf', 'nibel_wolf'], w: 10 },
    { e: ['velcher_task', 'velcher_task'], w: 19 },
    { e: ['nibel_wolf', 'nibel_wolf', 'velcher_task'], w: 10 },
    { e: ['nibel_wolf', 'nibel_wolf', 'velcher_task'], w: 4, type: 'pincer' },
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 10 },
    { e: ['valron', 'valron', 'valron'], w: 10 },
    { e: ['velcher_task', 'velcher_task'], w: 4, type: 'back' },
    { e: ['crown_lance', 'crown_lance'], w: 10 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 10 },
    { e: ['crown_lance'], w: 10 },
    { e: ['crown_lance', 'crown_lance'], w: 4, type: 'pincer' }
  ],
  wm_rocket_grass: [
    { e: ['nibel_wolf', 'nibel_wolf', 'nibel_wolf'], w: 30 },
    { e: ['velcher_task', 'velcher_task'], w: 29 },
    { e: ['nibel_wolf', 'nibel_wolf', 'velcher_task'], w: 29 },
    { e: ['nibel_wolf', 'nibel_wolf', 'velcher_task'], w: 13, type: 'pincer' }
  ],
  wm_rocket_forest: [
    { e: ['kyuvilduns', 'kyuvilduns', 'kyuvilduns', 'kyuvilduns'], w: 30 },
    { e: ['valron', 'valron', 'valron'], w: 29 },
    { e: ['velcher_task', 'velcher_task'], w: 29 },
    { e: ['velcher_task', 'velcher_task'], w: 13, type: 'back' }
  ],
  wm_rocket_beach: [
    { e: ['crown_lance', 'crown_lance'], w: 30 },
    { e: ['crown_lance', 'crown_lance', 'crown_lance'], w: 29 },
    { e: ['crown_lance'], w: 29 },
    { e: ['crown_lance', 'crown_lance'], w: 13, type: 'pincer' }
  ],

  // ===== Wutai region (world map) & Da-chao statue =====
  wm_wutai: [
    { e: ['tail_vault', 'razor_weed', 'razor_weed'], w: 8 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed', 'razor_weed'], w: 8 },
    { e: ['edgehead', 'tail_vault', 'tail_vault'], w: 8 },
    { e: ['tail_vault', 'tail_vault'], w: 8 },
    { e: ['thunderbird', 'thunderbird', 'thunderbird', 'thunderbird'], w: 6 },
    { e: ['bizarre_bug', 'bizarre_bug', 'thunderbird', 'thunderbird', 'thunderbird'], w: 6 },
    { e: ['tail_vault', 'tail_vault', 'tail_vault'], w: 6 },
    { e: ['tail_vault', 'bizarre_bug', 'bizarre_bug'], w: 6 },
    { e: ['thunderbird', 'thunderbird', 'thunderbird'], w: 1, type: 'back' },
    { e: ['tail_vault', 'tail_vault'], w: 1, type: 'back' },
    { e: ['bizarre_bug', 'bizarre_bug', 'bizarre_bug'], w: 5, type: 'side' },
    { e: ['tail_vault', 'thunderbird', 'bizarre_bug', 'bizarre_bug'], w: 2, type: 'pincer' },
    { e: ['adamantaimai'], w: 33 }
  ],
  wm_wutai_grass: [
    { e: ['tail_vault', 'razor_weed', 'razor_weed'], w: 25 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed', 'razor_weed'], w: 25 },
    { e: ['edgehead', 'tail_vault', 'tail_vault'], w: 25 },
    { e: ['tail_vault', 'tail_vault'], w: 25 }
  ],
  wm_wutai_dirt: [
    { e: ['thunderbird', 'thunderbird', 'thunderbird', 'thunderbird'], w: 18 },
    { e: ['bizarre_bug', 'bizarre_bug', 'thunderbird', 'thunderbird', 'thunderbird'], w: 18 },
    { e: ['tail_vault', 'tail_vault', 'tail_vault'], w: 18 },
    { e: ['tail_vault', 'bizarre_bug', 'bizarre_bug'], w: 18 },
    { e: ['thunderbird', 'thunderbird', 'thunderbird'], w: 3, type: 'back' },
    { e: ['tail_vault', 'tail_vault'], w: 3, type: 'back' },
    { e: ['bizarre_bug', 'bizarre_bug', 'bizarre_bug'], w: 16, type: 'side' },
    { e: ['tail_vault', 'thunderbird', 'bizarre_bug', 'bizarre_bug'], w: 6, type: 'pincer' }
  ],
  wm_wutai_beach: [{ e: ['adamantaimai'], w: 100 }],
  da_chao: [
    { e: ['razor_weed', 'razor_weed', 'razor_weed'], w: 5 },
    { e: ['bizarre_bug', 'bizarre_bug'], w: 8 },
    { e: ['jayjujayme', 'jayjujayme', 'bizarre_bug'], w: 7 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed'], w: 3, type: 'back' },
    { e: ['foulander', 'bizarre_bug', 'bizarre_bug', 'bizarre_bug'], w: 9 },
    { e: ['foulander', 'foulander'], w: 12 },
    { e: ['foulander', 'foulander', 'foulander'], w: 7 },
    { e: ['foulander', 'foulander'], w: 5, type: 'back' },
    { e: ['jayjujayme', 'jayjujayme', 'jayjujayme', 'garuda'], w: 10 },
    { e: ['garuda', 'garuda'], w: 9 },
    { e: ['jayjujayme', 'jayjujayme', 'garuda'], w: 11 },
    { e: ['garuda', 'garuda'], w: 4, type: 'pincer' },
    { e: ['garuda', 'garuda', 'foulander'], w: 4 },
    { e: ['garuda', 'garuda', 'garuda'], w: 4 },
    { e: ['foulander', 'foulander', 'garuda'], w: 1, type: 'pincer' }
  ],
  da_chao_base: [
    { e: ['razor_weed', 'razor_weed', 'razor_weed'], w: 33 },
    { e: ['bizarre_bug', 'bizarre_bug'], w: 30 },
    { e: ['jayjujayme', 'jayjujayme', 'bizarre_bug'], w: 25 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed'], w: 13, type: 'back' }
  ],
  da_chao_left_hand: [
    { e: ['foulander', 'bizarre_bug', 'bizarre_bug', 'bizarre_bug'], w: 30 },
    { e: ['foulander', 'foulander'], w: 28 },
    { e: ['foulander', 'foulander', 'foulander'], w: 23 },
    { e: ['foulander', 'foulander'], w: 19, type: 'back' }
  ],
  da_chao_lower_junction: [
    { e: ['foulander', 'bizarre_bug', 'bizarre_bug', 'bizarre_bug'], w: 25 },
    { e: ['foulander', 'foulander'], w: 23 },
    { e: ['foulander', 'foulander', 'foulander'], w: 21 },
    { e: ['jayjujayme', 'jayjujayme', 'bizarre_bug'], w: 19 },
    { e: ['foulander', 'foulander'], w: 13, type: 'back' }
  ],
  da_chao_right_hand: [
    { e: ['jayjujayme', 'jayjujayme', 'jayjujayme', 'garuda'], w: 33 },
    { e: ['garuda', 'garuda'], w: 30 },
    { e: ['jayjujayme', 'jayjujayme', 'garuda'], w: 25 },
    { e: ['garuda', 'garuda'], w: 13, type: 'pincer' }
  ],
  da_chao_upper_junction: [
    { e: ['jayjujayme', 'jayjujayme', 'jayjujayme', 'garuda'], w: 25 },
    { e: ['garuda', 'garuda'], w: 23 },
    { e: ['jayjujayme', 'jayjujayme', 'garuda'], w: 21 },
    { e: ['bizarre_bug', 'bizarre_bug'], w: 19 },
    { e: ['garuda', 'garuda'], w: 13, type: 'pincer' }
  ],
  da_chao_top_hand: [
    { e: ['garuda', 'garuda', 'foulander'], w: 25 },
    { e: ['garuda', 'garuda', 'garuda'], w: 23 },
    { e: ['foulander', 'foulander'], w: 21 },
    { e: ['jayjujayme', 'jayjujayme', 'garuda'], w: 19 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed'], w: 6, type: 'back' },
    { e: ['foulander', 'foulander', 'garuda'], w: 6, type: 'pincer' }
  ],

  // ===== Temple of the Ancients region (FF7 "Woodlands Area") & temple =====
  wm_temple: [
    { e: ['under_lizard'], w: 16 },
    { e: ['dual_horn'], w: 7 },
    { e: ['dual_horn', 'dual_horn'], w: 7 },
    { e: ['dual_horn'], w: 3, type: 'back' },
    { e: ['under_lizard', 'under_lizard'], w: 8 },
    { e: ['tonadu'], w: 33 },
    { e: ['slaps', 'slaps', 'slaps'], w: 8 },
    { e: ['slaps', 'slaps', 'slaps', 'slaps', 'slaps'], w: 7 },
    { e: ['kelzmelzer', 'kelzmelzer'], w: 7 },
    { e: ['slaps', 'slaps', 'slaps', 'slaps'], w: 3, type: 'pincer' }
  ],
  wm_temple_grass: [
    { e: ['under_lizard'], w: 30 },
    { e: ['dual_horn'], w: 29 },
    { e: ['dual_horn', 'dual_horn'], w: 29 },
    { e: ['dual_horn'], w: 13, type: 'back' }
  ],
  wm_temple_dirt: [
    { e: ['under_lizard'], w: 34 },
    { e: ['under_lizard', 'under_lizard'], w: 33 },
    { e: ['tonadu'], w: 33 }
  ],
  wm_temple_jungle: [
    { e: ['slaps', 'slaps', 'slaps'], w: 30 },
    { e: ['slaps', 'slaps', 'slaps', 'slaps', 'slaps'], w: 29 },
    { e: ['kelzmelzer', 'kelzmelzer'], w: 29 },
    { e: ['slaps', 'slaps', 'slaps', 'slaps'], w: 13, type: 'pincer' }
  ],
  wm_temple_beach: [{ e: ['tonadu'], w: 100 }],
  temple_ancients: [
    { e: ['kelzmelzer', 'kelzmelzer'], w: 18 },
    { e: ['under_lizard'], w: 16 },
    { e: ['kelzmelzer', 'kelzmelzer', 'toxic_frog', 'toxic_frog'], w: 15 },
    { e: ['under_lizard', 'toxic_frog', 'toxic_frog'], w: 14 },
    { e: ['doorbull'], w: 12 },
    { e: ['kelzmelzer', 'kelzmelzer'], w: 6, type: 'back' },
    { e: ['kelzmelzer', 'toxic_frog', 'toxic_frog'], w: 6, type: 'back' },
    { e: ['kelzmelzer', 'kelzmelzer'], w: 13, type: 'side' }
  ],
  temple_ancients_mural: [
    { e: ['ancient_dragon', 'ancient_dragon'], w: 33 },
    { e: ['doorbull'], w: 30 },
    { e: ['ancient_dragon', 'ancient_dragon', 'ancient_dragon'], w: 25 },
    { e: ['doorbull', 'doorbull'], w: 13, type: 'pincer' }
  ],

  // ===== Bone Village region (FF7 "Icicle Area" grass + beach), Sleeping Forest, Corral Valley, Forgotten Capital =====
  wm_bone: [
    { e: ['vlakorados'], w: 15 },
    { e: ['trickplay'], w: 14 },
    { e: ['trickplay', 'trickplay'], w: 14 },
    { e: ['trickplay', 'trickplay'], w: 3, type: 'back' },
    { e: ['vlakorados'], w: 3, type: 'back' },
    { e: ['tonadu'], w: 50 }
  ],
  wm_bone_grass: [
    { e: ['vlakorados'], w: 30 },
    { e: ['trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 6, type: 'back' },
    { e: ['vlakorados'], w: 6, type: 'back' }
  ],
  wm_bone_beach: [{ e: ['tonadu'], w: 100 }],
  // world-map region forest_north (Sleeping Forest band): same FF7 "Icicle Area" set
  wm_forest_north: [
    { e: ['vlakorados'], w: 30 },
    { e: ['trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 6, type: 'back' },
    { e: ['vlakorados'], w: 6, type: 'back' }
  ],
  // world-map region capital_area (Forgotten Capital valley): FF7 "Icicle Area" grass
  wm_capital: [
    { e: ['vlakorados'], w: 30 },
    { e: ['trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 29 },
    { e: ['trickplay', 'trickplay'], w: 6, type: 'back' },
    { e: ['vlakorados'], w: 6, type: 'back' }
  ],
  sleeping_forest: [],   // no random encounters in FF7
  corral_valley: [
    { e: ['boundfat', 'malldancer', 'malldancer', 'malldancer'], w: 38 },
    { e: ['malldancer', 'malldancer', 'malldancer', 'malldancer'], w: 34 },
    { e: ['malldancer', 'malldancer', 'boundfat', 'boundfat', 'boundfat'], w: 28 }
  ],
  forgotten_capital: [
    { e: ['hungry'], w: 50 },
    { e: ['boundfat', 'boundfat', 'boundfat'], w: 16 },
    { e: ['trickplay', 'boundfat', 'boundfat'], w: 15 },
    { e: ['trickplay', 'trickplay'], w: 12 },
    { e: ['boundfat', 'boundfat', 'boundfat'], w: 6, type: 'back' }
  ],
  forgotten_capital_path: [{ e: ['hungry'], w: 100 }],
  forgotten_capital_shell: [
    { e: ['boundfat', 'boundfat', 'boundfat'], w: 33 },
    { e: ['trickplay', 'boundfat', 'boundfat'], w: 30 },
    { e: ['trickplay', 'trickplay'], w: 25 },
    { e: ['boundfat', 'boundfat', 'boundfat'], w: 13, type: 'back' }
  ],
  corel_valley_cave: [
    { e: ['grimguard', 'grimguard', 'grimguard'], w: 21 },
    { e: ['acrophies'], w: 19 },
    { e: ['hungry', 'hungry'], w: 18 },
    { e: ['boundfat', 'boundfat', 'boundfat', 'hungry'], w: 16 },
    { e: ['boundfat', 'boundfat', 'boundfat', 'boundfat'], w: 14 },
    { e: ['boundfat', 'boundfat', 'hungry'], w: 6, type: 'back' },
    { e: ['hungry', 'hungry'], w: 6, type: 'pincer' }
  ],

  // ===== Chocobo tracks (random encounters while wearing a Chocobo Lure) =====
  // (the birds' levels per area: Enemy Mechanics FAQ 3.2.1 - Gold Saucer area L29 / L22, Rocket L22, Wutai L30)
  chocobo_desert_edge: [
    { e: ['chocobo_l29', 'flapbeat', 'flapbeat'], w: 16 },
    { e: ['spencer', 'spencer', 'chocobo_l29'], w: 16 },
    { e: ['flapbeat', 'flapbeat', 'chocobo_l22'], w: 34 },
    { e: ['chocobo_l22', 'harpy'], w: 34 }
  ],
  chocobo_rocket: [
    { e: ['chocobo_l22', 'valron', 'valron'], w: 16 },
    { e: ['kyuvilduns', 'kyuvilduns', 'chocobo_l22'], w: 16 },
    { e: ['chocobo_l22', 'velcher_task', 'kyuvilduns'], w: 34 },
    { e: ['velcher_task', 'velcher_task', 'chocobo_l22'], w: 34 }
  ],
  chocobo_wutai: [
    { e: ['chocobo_l30', 'tail_vault', 'tail_vault'], w: 50 },
    { e: ['razor_weed', 'razor_weed', 'razor_weed', 'chocobo_l30'], w: 25 },
    { e: ['chocobo_l30', 'tail_vault', 'tail_vault', 'tail_vault'], w: 25 }
  ],

  // ===== Region alias =====
  // world-map region desert: FF7 "Gold Saucer Area - Desert" sand (buggy / chocobo only)
  wm_desert: [
    { e: ['harpy'], w: 50 },
    { e: ['flapbeat', 'flapbeat', 'flapbeat', 'flapbeat'], w: 50 }
  ],

  // ===== Scripted fights (bosses and forced battles) - see docs/enemies_d1b.md for bg / music =====
  // Kalm flashback: the Dragon that attacks the Shinra truck (Sephiroth in the party). No rewards, no victory fanfare.
  event_flashback_dragon: [{ e: ['dragon'], w: 1, noEscape: true, noRewards: true }],
  // Mt. Corel bird's nest (Phoenix Downs).
  event_corel_nest: [{ e: ['cokatolis'], w: 1, noEscape: true }],
  // Corel Prison desert, Barret alone. No victory fanfare / pose in FF7.
  boss_dyne: [{ e: ['dyne'], w: 1, noEscape: true }],
  // Gongaga jungle entrance: Reno (row 1) and Rude (row 2).
  boss_turks_gongaga: [{ e: ['reno_2', 'rude_2'], w: 1, noEscape: true, rows: [1, 2] }],
  // Cave of the Gi 1st screen, first forced ghost fight.
  event_gi_spectors: [{ e: ['gi_spector', 'gi_spector'], w: 1, noEscape: true }],
  // Cave of the Gi 1st screen, second forced ghost fight.
  event_gi_spectors_b: [{ e: ['gi_spector', 'gi_spector', 'gi_spector'], w: 1, noEscape: true, rows: [1, 2, 2] }],
  // Cave of the Gi 3rd screen, the Stinger guarding the treasure.
  event_gi_stinger: [{ e: ['stinger'], w: 1, noEscape: true }],
  // Cave of the Gi 4th screen.
  boss_gi_nattak: [{ e: ['soul_fire', 'soul_fire', 'gi_nattak'], w: 1, noEscape: true, rows: [1, 1, 2] }],
  // Shinra Mansion safe (splits into lost_number_b / lost_number_c).
  boss_lost_number: [{ e: ['lost_number'], w: 1, noEscape: true }],
  // Mt. Nibel, mako fountain ("5 pipe" screen).
  boss_materia_keeper: [{ e: ['materia_keeper'], w: 1, noEscape: true }],
  // Rocket Town, Cid's backyard. No victory fanfare in FF7; the truck is a cutscene.
  boss_palmer: [{ e: ['palmer'], w: 1, noEscape: true }],
  // Wutai: start of the stolen-materia chase.
  event_attack_squad: [{ e: ['attack_squad', 'attack_squad'], w: 1, noEscape: true }],
  // Wutai town, northern shrine building.
  event_attack_squad_shrine: [
    { e: ['attack_squad', 'attack_squad', 'attack_squad'], w: 1, noEscape: true, rows: [1, 1, 2] }
  ],
  // Top of the Da-chao statue.
  boss_rapps: [{ e: ['rapps'], w: 1, noEscape: true }],
  // Godo's Pagoda (Yuffie alone; losing is not a game over). FF7's special pre-emptive flag (DynamixDJ's Enemy
  // Encounter FAQ): the boss is shown facing Yuffie but has its back to her (the first physical hit does double
  // damage), and both time bars start as in a normal battle.
  // Pagoda 1F.
  boss_gorky: [{ e: ['gorky'], w: 1, hidden: 'preempt', noEscape: true, noGameOver: true }],
  // Pagoda 2F.
  boss_shake: [{ e: ['shake'], w: 1, hidden: 'preempt', noEscape: true, noGameOver: true }],
  // Pagoda 3F.
  boss_chekhov: [{ e: ['chekhov'], w: 1, hidden: 'preempt', noEscape: true, noGameOver: true }],
  // Pagoda 4F.
  boss_staniv: [{ e: ['staniv'], w: 1, hidden: 'preempt', noEscape: true, noGameOver: true }],
  // Pagoda 5F. No victory fanfare / pose in FF7.
  boss_godo: [{ e: ['godo'], w: 1, hidden: 'preempt', noEscape: true, noGameOver: true }],
  // Temple of the Ancients clock, room I.
  event_temple_room1: [{ e: ['toxic_frog', 'toxic_frog', 'jemnezmy'], w: 1, noEscape: true, rows: [1, 1, 2] }],
  // Temple clock, room III.
  event_temple_room3: [{ e: ['8_eye', '8_eye'], w: 1, noEscape: true }],
  // Temple: falling to the bottom of the clock.
  event_temple_clock_pit: [
    { e: ['ancient_dragon', 'ancient_dragon'], w: 1, type: 'pincer', noEscape: true, groups: [1, 2] }
  ],
  // Temple mural room (Bahamut materia).
  boss_red_dragon: [{ e: ['red_dragon'], w: 1, noEscape: true }],
  // Temple, last corridor (room XII).
  boss_demons_gate: [{ e: ['demons_gate'], w: 1, noEscape: true }],
  // Forgotten Capital altar. FF7 keeps Aeris' Theme playing; no victory fanfare / pose.
  boss_jenova_life: [{ e: ['jenova_life'], w: 1, noEscape: true }]
});

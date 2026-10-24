// FF7 shop inventories (PS1 US), every town counter, with the Disc 2/3 changes as separate ids.
//
// Sources: references/text/Item_Materia_Locations_FAQ.txt "Shop Guide" and
// Guide_and_Walkthrough.txt "Shopping List", cross-checked with Monster_Item_Weapon_Lists.txt.
// See docs/shops.md for the id -> town / counter / disc table.
//
// Conventions:
// - type 'materia' shops stock ONLY materia ids. Several FF7 counters sell items AND materia on one
//   menu (Sector 7, North Corel, Gongaga, Rocket Town); those are split into an items/weapons id
//   plus a `_materia` id for the same counter.
// - item / weapon / accessory shops stock ids from items, weapons, armor or accessories exactly as
//   FF7 does (e.g. Grenade in a weapon shop, Choco Feather in Wutai's item shop): resolve them with
//   the generic "any item" lookup (items -> weapons -> armor -> accessories).
// - `type` follows what the counter sells in that disc (the Junon counters that switch to other
//   characters' weapons on Disc 2 are type 'weapon' in their _d2 version).
// - Buy prices come from each entry's `price` (items/equipment) or materia.js (materia).
// - Not shops (scripted one-off sales, see docs/shops.md): Batteries (Wall Market weapon shop owner,
//   3 x 100 gil, Disc 1), Chocobo Lure materia (Choco Billy, 2000 gil, Disc 1), Sneak Glove
//   (Wall Market weapon shop owner, 129000 gil, Disc 2/3), Wall Market Inn vending machine tiaras.

Object.assign(FF7.data.shops, {
  // ============================================================ Midgar, Disc 1
  sector7_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['iron_bangle', 'assault_gun', 'grenade'],
  },
  sector7_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote'],
  },
  sector7_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'restore'],
  },
  sector5_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'tent'],
  },
  sector5_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['titan_bangle', 'grenade'],
  },
  sector5_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'restore'],
  },
  wallmarket_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'echo_screen', 'eye_drop', 'hyper', 'tranquilizer',
      'hi_potion', 'tent'],
  },
  wallmarket_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['mythril_rod', 'metal_knuckle', 'assault_gun', 'titan_bangle', 'mythril_armlet'],
  },
  wallmarket_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'restore', 'cover'],
  },
  sector7_pillar_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'grenade', 'hyper', 'tranquilizer', 'tent'],
  },
  shinra_hq_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'eye_drop', 'tent'],
  },

  // ================================================================== Kalm
  kalm_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'eye_drop', 'hyper', 'tranquilizer', 'tent'],
  },
  kalm_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['mythril_saber', 'cannon_ball', 'mythril_claw', 'full_metal_staff', 'mythril_armlet'],
  },
  kalm_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['earth', 'poison', 'steal', 'sense', 'heal'],
  },

  // ========================================================== Chocobo Farm
  chocobo_farm_items: {
    name: 'Chocobo Farm Store', type: 'item',
    stock: ['mimett_greens', 'curiel_greens', 'pahsana_greens', 'tantal_greens', 'krakka_greens',
      'gysahl_greens'],
  },
  chocobo_farm_items_d2: {
    name: 'Chocobo Farm Store', type: 'item',
    stock: ['lasan_nut', 'saraha_nut', 'luchile_nut', 'pepio_nut', 'mimett_greens', 'curiel_greens',
      'pahsana_greens', 'tantal_greens', 'krakka_greens', 'gysahl_greens'],
  },

  // =========================================================== Fort Condor
  fort_condor_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'hyper', 'tranquilizer', 'tent'],
  },
  fort_condor_items_d2: {
    name: 'Item Shop', type: 'item',
    stock: ['hi_potion', 'phoenix_down', 'ether', 'hyper', 'tranquilizer', 'tent', 's_mine'],
  },
  fort_condor_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'lightning', 'ice', 'restore'],
  },
  fort_condor_materia_d2: {
    name: 'Materia Shop', type: 'materia',
    stock: ['throw', 'manipulate', 'deathblow', 'destruct', 'all'],
  },

  // ================================================================= Junon
  junon_lower_items: {
    name: 'Item Shop', type: 'item',
    stock: ['mythril_armlet', 'potion', 'phoenix_down', 'grenade', 'tent'],
  },
  junon_upper_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'antidote', 'eye_drop', 'echo_screen', 'hyper',
      'tranquilizer', 'tent'],
  },
  junon_upper_items_d2: {
    name: 'Item Shop', type: 'weapon',
    stock: ['wind_slash', 'twin_viper', 'viper_halberd', 'dragoon_lance', 'peacemaker', 'buntline',
      'magic_comb', 'plus_barrette', 'wizard_staff', 'wizer_staff'],
  },
  junon_upper_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['hardedge', 'grand_glove', 'atomic_scissors', 'striking_staff', 'diamond_pin', 'boomerang'],
  },
  junon_upper_weapons_d2: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['rune_blade', 'enhance_sword', 'w_machine_gun', 'drill_arm', 'platinum_fist',
      'kaiser_knuckle', 'fairy_tale'],
  },
  junon_upper_weapons2: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['mythril_saber', 'cannon_ball', 'mythril_claw', 'full_metal_staff', 'mythril_clip'],
  },
  junon_upper_weapons2_d2: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['atomic_scissors', 'grand_glove', 'striking_staff', 'diamond_pin', 'boomerang',
      'yellow_m_phone', 'spear', 'trident', 'quicksilver'],
  },
  junon_upper_accessories: {
    name: 'Accessory Shop', type: 'accessory',
    stock: ['silver_glasses', 'headband'],
  },
  junon_upper_accessories_d2: {
    name: 'Accessory Shop', type: 'weapon',
    stock: ['platinum_bangle', 'powersoul', 'enemy_launcher', 'magic_shuriken', 'white_m_phone',
      'black_m_phone', 'silver_m_phone', 'sniper_cr'],
  },
  junon_upper_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['sense', 'seal', 'restore', 'heal', 'revive'],
  },
  junon_upper_materia2: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'earth', 'poison'],
  },
  junon_upper_materia2_d2: {
    name: 'Materia Shop', type: 'weapon',
    stock: ['nail_bat', 'rocket_punch', 'work_glove', 'hairpin', 'superball', 'trumpet_shell', 'mop',
      'silver_rifle'],
  },

  // ============================================================ Cargo ship
  cargo_ship_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down'],
  },

  // ========================================================= Costa del Sol
  costa_del_sol_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'soft', 'antidote', 'eye_drop', 'hyper',
      'tranquilizer', 'tent'],
  },
  costa_del_sol_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['platinum_bangle', 'carbon_bangle', 'four_slots', 'molotov'],
  },
  costa_del_sol_weapons_d2: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['solid_bazooka', 'centclip', 'spiral_shuriken', 'long_barrel_r', 'gold_m_phone', 's_mine'],
  },
  costa_del_sol_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['heal', 'revive', 'restore', 'seal', 'fire', 'ice', 'lightning'],
  },
  costa_del_sol_materia_d2: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'earth', 'gravity', 'poison'],
  },

  // =========================================================== North Corel
  north_corel_items: {
    name: 'Tool Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'tent'],
  },
  north_corel_general: {
    name: 'General Store', type: 'item',
    stock: ['maidens_kiss', 'cornucopia', 'soft', 'hyper', 'tranquilizer'],
  },
  north_corel_materia: {
    name: 'General Store', type: 'materia',
    stock: ['transform'],
  },
  north_corel_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['carbon_bangle', 'force_stealer', 'molotov'],
  },

  // ============================================== Gold Saucer / Corel Prison
  gold_saucer_items: {
    name: 'Hotel Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'ether', 'antidote', 'maidens_kiss', 'cornucopia', 'soft',
      'echo_screen', 'hyper', 'tranquilizer'],
  },
  corel_prison_items: {
    name: 'General Store', type: 'item',
    stock: ['potion', 'phoenix_down', 'tent'],
  },

  // =============================================================== Gongaga
  gongaga_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'tent', 'maidens_kiss', 'cornucopia', 'soft',
      'echo_screen', 'hyper', 'tranquilizer'],
  },
  gongaga_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['hardedge', 'grand_glove', 'atomic_scissors', 'striking_staff', 'diamond_pin', 'boomerang',
      'impaler', 'shrivel', 'molotov'],
  },
  gongaga_accessories: {
    name: 'Accessory Shop', type: 'accessory',
    stock: ['headband', 'silver_glasses', 'star_pendant', 'talisman', 'white_cape', 'fury_ring'],
  },
  gongaga_materia: {
    name: 'Accessory Shop', type: 'materia',
    stock: ['mystify', 'time', 'heal', 'transform'],
  },

  // ========================================================== Cosmo Canyon
  cosmo_canyon_items: {
    name: 'General Store', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'ether', 'tent', 'maidens_kiss', 'cornucopia', 'soft',
      'hyper', 'tranquilizer'],
  },
  cosmo_canyon_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['butterfly_edge', 'tiger_fang', 'heavy_vulcan', 'prism_staff', 'silver_barrette', 'pinwheel',
      'green_m_phone', 'silver_armlet'],
  },
  cosmo_canyon_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['mp_plus', 'hp_plus', 'mystify', 'transform'],
  },

  // ============================================================= Nibelheim
  nibelheim_items: {
    name: 'General Store', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'tent'],
  },

  // =========================================================== Rocket Town
  rocket_town_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'ether', 'hyper', 'tranquilizer', 'tent'],
  },
  rocket_town_materia: {
    name: 'Item Shop', type: 'materia',
    stock: ['barrier', 'exit', 'time'],
  },
  rocket_town_items_d2: {
    name: 'Item Shop', type: 'item',
    stock: ['hi_potion', 'phoenix_down', 'ether', 'tent'],
  },
  rocket_town_materia_d2: {
    name: 'Item Shop', type: 'materia',
    stock: ['barrier', 'exit', 'time', 'throw', 'deathblow', 'manipulate'],
  },
  rocket_town_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['shotgun', 'gold_armlet', 'power_wrist', 'protect_vest', 'earring', 'talisman'],
  },
  rocket_town_weapons_d2: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['s_mine', 'gold_armlet', 'edincoat', 'power_wrist', 'protect_vest', 'earring', 'talisman',
      'peace_ring', 'safety_bit'],
  },

  // ================================================================= Wutai
  wutai_items: {
    name: 'Item Shop', type: 'item',
    stock: ['hi_potion', 'phoenix_down', 'ether', 'hyper', 'tranquilizer', 'tent', 'fire_veil',
      'swift_bolt', 'choco_feather'],
  },
  // (not in the PS1 game: Config > Turks Join - sold in Wutai once Reno, Rude and Elena have joined, js/maps/extra/turks.js)
  wutai_turks_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['stun_baton', 'tesla_rod', 'iron_knuckles', 'titan_fists', 'turk_revolver', 'marksman'],
  },
  wutai_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['murasame', 'diamond_knuckle', 'chainsaw', 'aurora_rod', 'gold_barrette', 'slash_lance',
      'blue_m_phone', 'razor_ring', 'shortbarrel'],
  },

  // ========================================== Temple / Bone Village / Icicle
  temple_items: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'hi_potion', 'phoenix_down', 'ether', 'hyper', 'tranquilizer', 'maidens_kiss',
      'tent'],
  },
  bone_village_items: {
    name: 'Item Shop', type: 'item',
    stock: ['diamond_bangle', 'rune_armlet', 'potion', 'hi_potion', 'phoenix_down', 'ether', 'hyper',
      'tranquilizer', 'tent'],
  },
  icicle_inn_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['organics', 'dragon_claw', 'microlaser', 'adaman_clip', 'hawkeye', 'red_m_phone', 'mast_ax',
      'lariat', 'tent', 'hi_potion'],
  },

  // ========================================================== Chocobo Sage
  chocobo_sage_items: {
    name: 'General Store', type: 'item',
    stock: ['porov_nut', 'pram_nut', 'sylkis_greens', 'reagan_greens'],
  },

  // ======================================================= Mideel (Disc 2+)
  // Before Ultimate WEAPON's attack these are the town counters; afterwards the woman with the
  // white chocobo sells mideel_items + mideel_weapons + mideel_materia, and the rebuilt counters
  // switch to mideel_items_after / mideel_materia_after.
  mideel_items: {
    name: 'Item Shop', type: 'item',
    stock: ['hi_potion', 'phoenix_down', 'ether', 'hyper', 'tranquilizer', 'remedy', 'tent'],
  },
  mideel_weapons: {
    name: 'Weapon Shop', type: 'weapon',
    stock: ['crystal_sword', 'crystal_glove', 'am_cannon', 'crystal_comb', 'crystal_cross',
      'crystal_m_phone', 'partisan', 'winchester', 'crystal_bangle', 'wizard_bracelet'],
  },
  mideel_accessories: {
    name: 'Accessory Shop', type: 'accessory',
    stock: ['amulet', 'fire_ring', 'ice_ring', 'bolt_ring', 'fairy_ring', 'jem_ring', 'white_cape'],
  },
  mideel_materia: {
    name: 'Materia Shop', type: 'materia',
    stock: ['hp_plus', 'mp_plus', 'transform', 'gravity', 'destruct'],
  },
  mideel_items_after: {
    name: 'Item Shop', type: 'item',
    stock: ['potion', 'phoenix_down', 'antidote', 'tent'],
  },
  mideel_materia_after: {
    name: 'Materia Shop', type: 'materia',
    stock: ['fire', 'ice', 'lightning', 'restore'],
  },
});

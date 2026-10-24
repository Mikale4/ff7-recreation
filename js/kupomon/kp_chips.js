// Kupomon Skill Chips (Pokémon's TMs, docs/KUPOMON_WORLD.md "Skill Chips"): KP.ITEMS entries of kind 'chip' and where
// they're found (KP.CHIP_PLACES). A chip teaches its move to a compatible moogle and isn't used up. Compatible: its type
// or second type is in the chip's types, or it's named in also, or the move is in its learnset (KP.chipFits).
// Numbered in the order you reach them: about half sold in the Mog Centers' Marts (KP.chipStock), half lying on the
// routes and in the caves (KP.placeChips; hidden ones have no sparkle: face the spot and press OK). Early chips are
// modest, the last ones the biggest moves in the game. The engine is js/kupomon/kp_learn.js; tools/kp_learncheck.js
// checks every chip and that every tile is free, walkable and reachable.
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  KP.CHIP_PLACES = KP.CHIP_PLACES || [];

  // [number, move, price, types, also (species), place]: place is a Mog Center (its Mart sells it) or [map, x, y, 'hidden'?]
  const PHYS = ['freelancer', 'warrior', 'monk', 'thief', 'beast', 'dragoon'];
  const CHIPS = [
    // ---- Region 1: Pomville to Kurotsuki
    [1, 'dash', 1500, PHYS, [], ['kp_route1', 27, 14]],
    [2, 'battle_song', 1500, ['bard', 'warrior', 'monk', 'freelancer'], [], 'kp_center'],
    [3, 'bite', 1500, ['beast', 'dragoon', 'thief', 'monk'], ['icemog_yeti', 'galimog_werebeast'], ['kp_route1n', 2, 7, 'hidden']],
    [4, 'aero', 1500, ['whitemage', 'redmage', 'summoner', 'dragoon', 'timemage'], ['breezlin_miller', 'kitemog_flier'], 'kp_mogridge_center'],
    [5, 'rend_armor', 2000, ['freelancer', 'knight', 'warrior', 'dragoon', 'monk', 'beast'], [], 'kp_mogridge_center'],
    [6, 'verthunder', 2000, ['redmage', 'blackmage', 'timemage'], ['voltkin_electrician', 'voltkin_stormcaller'], ['kp_route2', 17, 16]],
    [7, 'spore', 2000, ['beast', 'summoner'], ['chemmog_chemist', 'chemmog_alchemist', 'bogmog_witch', 'salvepom_salve_maker', 'salvepom_green_mage'], ['kp_whisperwood', 1, 20]],
    [8, 'searing_light', 2500, ['summoner', 'whitemage', 'redmage'], [], ['kp_whisperwood_deep', 30, 13, 'hidden']],
    [9, 'maim', 2500, ['freelancer', 'warrior', 'knight', 'thief', 'dragoon', 'beast'], [], ['kp_route3', 30, 18]],
    [10, 'poison_dart', 2000, ['thief', 'ranger', 'machinist'], ['chemmog_chemist', 'chemmog_alchemist', 'bogmog_witch', 'bogmog_hag'], 'kp_kurotsuki_center'],
    [11, 'snap_shot', 2000, ['ranger', 'machinist', 'thief'], [], 'kp_kurotsuki_center'],
    // ---- Region 2: Fernwick to Mogfield
    [12, 'harpoon', 3000, ['dragoon', 'ranger', 'warrior'], ['puddlepom_rainmaker', 'puddlepom_hydromancer'], ['kp_route4', 5, 27]],
    [13, 'protect', 2500, ['freelancer', 'whitemage', 'knight', 'monk', 'redmage', 'summoner'], [], 'kp_fernwick_center'],
    [14, 'slow', 2500, ['timemage', 'redmage', 'bard', 'blackmage'], [], 'kp_fernwick_center'],
    [15, 'snack_break', 3000, ['freelancer', 'bard', 'beast'], [], 'kp_fernwick_center'],
    [16, 'aura_bolt', 3500, ['monk', 'warrior', 'knight'], [], ['kp_route5', 12, 21]],
    [17, 'drill', 3500, ['machinist', 'knight'], ['relikin_digger', 'relikin_archaeologist', 'truffkin_forager', 'truffkin_druid', 'truffkin_morpher'], ['kp_mtkupo_1', 6, 8]],
    [18, 'diamond_dust', 3500, ['summoner', 'blackmage', 'whitemage'], ['icemog_climber', 'icemog_yeti', 'shredpom_sledder', 'shredpom_snowboarder'], ['kp_mtkupo_2', 38, 19, 'hidden']],
    [19, 'auto_crossbow', 3000, ['machinist', 'ranger', 'thief'], [], 'kp_cogsworth_center'],
    [20, 'oil_change', 3500, ['machinist', 'freelancer'], [], 'kp_cogsworth_center'],
    [21, 'iron_wall', 3500, ['knight', 'machinist', 'monk', 'warrior'], [], 'kp_cogsworth_center'],
    [22, 'lullaby', 3500, ['bard', 'whitemage', 'summoner', 'beast'], [], ['kp_route6', 2, 27]],
    [23, 'chakra', 4000, ['monk', 'whitemage', 'warrior', 'beast'], [], 'kp_mogfield_center'],
    [24, 'bravery', 4500, ['freelancer', 'warrior', 'knight', 'dragoon', 'monk', 'thief'], [], 'kp_mogfield_center'],
    // ---- Region 3: Nibel Peaks to Skyport
    [25, 'blizzara', 4000, ['blackmage', 'redmage', 'summoner'], ['icemog_climber', 'icemog_yeti', 'shredpom_sledder', 'shredpom_snowboarder', 'nimbopom_forecaster', 'nimbopom_meteorologist'], ['kp_route7', 2, 32]],
    [26, 'jump', 4500, ['dragoon', 'thief', 'monk', 'ranger'], [], 'kp_nibelpeaks_center'],
    [27, 'haste', 4000, ['freelancer', 'timemage', 'bard', 'redmage', 'whitemage', 'thief'], [], 'kp_nibelpeaks_center'],
    [28, 'stasis_sword', 4500, ['knight', 'warrior', 'redmage'], [], 'kp_nibelpeaks_center'],
    [29, 'gaia_rage', 4500, ['beast', 'summoner', 'monk', 'timemage'], [], ['kp_route8', 25, 7]],
    [30, 'fira', 5000, ['blackmage', 'redmage', 'summoner'], ['puddipom_chef', 'puddipom_gourmet', 'lumimog_lamplighter', 'lumimog_beacon', 'tekkupo_magitek'], 'kp_sandsea_center'],
    [31, 'steal_heart', 4500, ['thief', 'bard', 'redmage'], [], 'kp_sandsea_center'],
    [32, 'white_wind', 5000, ['redmage', 'whitemage', 'summoner', 'bard'], [], 'kp_sandsea_center'],
    [33, 'gravity', 4500, ['timemage', 'blackmage', 'summoner', 'machinist'], [], ['kp_ruins_1', 26, 19]],
    [34, 'shadow_stitch', 5000, ['thief', 'summoner', 'blackmage'], [], ['kp_ruins_2', 27, 14, 'hidden']],
    [35, 'sharpshot', 5000, ['ranger', 'machinist', 'thief'], [], ['kp_route9', 3, 3]],
    [36, 'lance_charge', 5500, ['dragoon', 'knight', 'beast', 'warrior'], [], 'kp_skyport_center'],
    [37, 'chainsaw', 6000, ['machinist'], ['chopkin_woodcutter', 'chopkin_ravager', 'hedgepom_gardener', 'hedgepom_topiarist', 'farmmog_harvester'], 'kp_skyport_center'],
    [38, 'sleep_spell', 5500, ['blackmage', 'redmage', 'timemage', 'summoner'], ['spykin_agent', 'spykin_turk'], ['kp_hojo_hq_2', 22, 10]],
    // ---- Region 4: Bloomhaven to the Coliseum, and after
    [39, 'aqua_breath', 6000, ['redmage', 'summoner', 'ranger'], ['buoypom_lifeguard', 'buoypom_coastguard'], ['kp_route10', 32, 20]],
    [40, 'holy', 7500, ['whitemage', 'knight'], [], 'kp_bloomhaven_center'],
    [41, 'judgment_bolt', 6500, ['summoner', 'blackmage', 'whitemage'], [], 'kp_bloomhaven_center'],
    [42, 'cura', 6500, ['whitemage', 'redmage', 'summoner'], [], 'kp_bloomhaven_center'],
    [43, 'doom', 6000, ['blackmage', 'summoner', 'timemage'], [], ['kp_route11', 27, 16, 'hidden']],
    [44, 'drain', 5500, ['blackmage', 'summoner', 'beast', 'thief'], [], 'kp_ravenmoor_center'],
    [45, 'graviga', 8000, ['timemage', 'blackmage', 'summoner'], [], 'kp_ravenmoor_center'],
    [46, 'requiem', 6500, ['bard', 'summoner', 'redmage'], [], 'kp_ravenmoor_center'],
    [47, 'thundaga', 8000, ['blackmage', 'redmage', 'machinist'], [], ['kp_route12', 8, 20]],
    [48, 'earthen_fury', 8000, ['summoner', 'beast', 'monk'], [], ['kp_lifestream_1', 2, 15]],
    [49, 'brute_force', 8500, ['freelancer', 'monk', 'warrior', 'beast', 'knight'], [], ['kp_route13', 13, 5]],
    [50, 'high_jump', 8500, ['dragoon', 'monk', 'thief'], [], ['kp_summit_1', 17, 13, 'hidden']],
    [51, 'cannon', 8500, ['ranger', 'machinist'], [], ['kp_summit_2', 33, 8]],
    [52, 'climhazzard', 8500, ['warrior', 'knight', 'dragoon'], [], ['kp_route14', 21, 27]],
    [53, 'throw', 9000, ['thief', 'ranger'], ['juggler_juggler', 'juggler_jester'], 'kp_coliseum_center'],
    [54, 'kupo_rush', 9000, ['freelancer', 'warrior', 'monk', 'beast', 'knight', 'bard', 'thief', 'dragoon'], [], 'kp_coliseum_center'],
    [55, 'saint_cross', 9500, ['knight', 'whitemage', 'warrior'], [], 'kp_coliseum_center'],
    [56, 'satellite_beam', 10000, ['machinist', 'timemage'], [], 'kp_coliseum_center'],
    [57, 'flare', 12000, ['blackmage', 'summoner'], [], ['kp_crater_1', 34, 12]],
    [58, 'wild_rush', 9000, ['beast', 'warrior', 'dragoon', 'monk'], [], ['kp_crater_2', 7, 16]],
    [59, 'meteor', 12000, ['timemage', 'blackmage'], [], ['kp_mognet_2', 22, 8, 'hidden']],
  ];

  for (const [n, move, price, types, also, place] of CHIPS) {
    const id = 'chip_' + String(n).padStart(2, '0'), mv = KP.MOVES[move], name = mv ? mv.name : move;
    KP.ITEMS[id] = { name: `Skill Chip ${String(n).padStart(2, '0')}: ${name}`, kind: 'chip', move, price, types, also, desc: `Teaches ${name} to a compatible moogle. Reusable.` };
    if (typeof place === 'string') KP.CHIP_PLACES.push({ chip: id, mart: place });
    else KP.CHIP_PLACES.push({ chip: id, map: place[0], at: [place[1], place[2]], hidden: place[3] === 'hidden' });
  }
})();

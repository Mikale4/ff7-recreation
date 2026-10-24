// Kupomon expansion pack 'era5' (docs/KUPOMON_CONTENT.md): the moogles of FF VIII and FF IX, as homage in our own
// words. FF VIII: SeeD cadets of the Garden, the gunblade rival, Draw points and Guardian Forces, Triple Triad, Laguna's
// crew (Laguna, Kiros, Ward), Galbadia's chasing spider robot, Esthar's odd professor, the sorceresses, the Ragnarok (a
// pseudo-legendary), Chicobo, the red Moombas, Mini Mog, Boko and the cafeteria hot dogs. FF IX: Mog the Eidolon, the
// Tantalus troupe, Burmecia's dragoons, Cleyra's harp, the Qu gourmands, the Black Mage village, the Knights of Pluto,
// Alexandria's general, Lindblum's airships, Treno's card game, Chocobo Hot and Cold, the Ragtime Mouse and the Mognet
// moogles (Mogki, Monty, Moodon, Mogrich, Mopli, Mimoza, Mocha, Moorock, Serino, Mozme, Moguta, Moonte, Suzuna, Momatose).
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const B = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });
  const S = (moogle, job, base, o) => Object.assign({ moogle, job, base }, o);
  // each line's colours (the robot's own: fur, pom-pom, nose, wings)
  const C = {
    seed: { fur: '#f2eee6', pom: '#3a6ad8', wing: '#2a3a7a' },
    scar: { fur: '#eeeae4', pom: '#f0d060', wing: '#5a5a6a' },
    draw: { fur: '#f4ece4', pom: '#ff5040', wing: '#c03050' },
    triad: { fur: '#f2ece0', pom: '#c040c0', wing: '#5a3a8a' },
    cramp: { fur: '#f0e8dc', pom: '#4a3a2a', wing: '#4a5a3a' },
    katal: { fur: '#e8ddd0', pom: '#8a2a5a', wing: '#5a2a3a' },
    hush: { fur: '#e6e2da', pom: '#5a6a7a', wing: '#3a4a5a' },
    chase: { fur: '#d8d8dc', pom: '#ff3020', wing: '#4a4a52', nose: '#ff3020' },
    oddi: { fur: '#eef0f4', pom: '#40c0e0', wing: '#6a7aa0' },
    sorce: { fur: '#ece4f0', pom: '#a040ff', wing: '#2a1a3a' },
    ragna: { fur: '#f0e6e0', pom: '#e02020', wing: '#a01818' },
    chico: { fur: '#f8f0d0', pom: '#ffd020', wing: '#e8b020' },
    moomba: { fur: '#c8402a', pom: '#f0d090', wing: '#8a2a1a', nose: '#4a2a1a' },
    pocket: { fur: '#fbf6ee', pom: '#ff6090', wing: '#f0a0c0' },
    boko: { fur: '#f6efd8', pom: '#ffcc20', wing: '#d8a020' },
    eido: { fur: '#fdf8f4', pom: '#ff60a0', wing: '#e080b0', nose: '#ff4070' },
    monty: { fur: '#f2e8dc', pom: '#ff5a3a', wing: '#c04a3a' },
    mopli: { fur: '#e8e0d8', pom: '#c02030', wing: '#7a3040' },
    mimoza: { fur: '#f4ead4', pom: '#d8a040', wing: '#c09060' },
    mocha: { fur: '#efe6dc', pom: '#7ac050', wing: '#8a6a4a' },
    moorock: { fur: '#e4dccc', pom: '#ffd040', wing: '#4a4a7a' },
    moodon: { fur: '#ecebea', pom: '#3a5ab0', wing: '#6a6e7a' },
    serino: { fur: '#f6f0ea', pom: '#c02838', wing: '#9a2a3a' },
    mogrich: { fur: '#efe6d6', pom: '#e09030', wing: '#8a6030' },
    mozme: { fur: '#ece6f2', pom: '#8040c0', wing: '#3a2a5a' },
    moguta: { fur: '#f4ecd8', pom: '#ffb020', wing: '#c08a30' },
    moonte: { fur: '#f0ece8', pom: '#e8c040', wing: '#5a5a5a' },
    mogki: { fur: '#f6f0e6', pom: '#ff4040', wing: '#d05050' },
    suzuna: { fur: '#fbf8f2', pom: '#80c0ff', wing: '#c0d0f0' },
    moma: { fur: '#eeeaf4', pom: '#8090e0', wing: '#6070a0' },
    booya: { fur: '#f4ebdc', pom: '#ffd040', wing: '#3a6ad0' },
  };

  KP.content('era5', {
    // ---------------------------------------------------------------- jobs (one per stage)
    jobs: {
      // Seedmog: the Garden's cadets
      e5_cadet: J('Garden Cadet', 'freelancer', { hat: 'cap', body: 'jacket', weapon: 'bokken', g1: '#2a3a7a', g2: '#d8b040' }),
      e5_seed: J('SeeD', 'warrior', { hat: 'beret', body: 'longcoat', weapon: 'broadsword', g1: '#1e2a5a', g2: '#e0c050' }),
      e5_commander: J('Commander', 'warrior', { hat: 'captain', body: 'longcoat', weapon: 'gunblade', cape: '#1e2a5a', g1: '#1e2a5a', g2: '#f0d060', glow: '#a0c8ff' }),
      // Scarmog: the gunblade rival
      e5_disciplinarian: J('Disciplinarian', 'warrior', { hat: 'none', body: 'trench', weapon: 'baton', g1: '#c8c8c0', g2: '#3a5ab0' }),
      e5_gunblade_rival: J('Gunblade Rival', 'warrior', { hat: 'none', body: 'trench', weapon: 'gunblade', g1: '#d8d8d0', g2: '#3a5ab0', glow: '#ff6030' }),
      e5_sorceress_knight: J('Sorceress Knight', 'warrior', { hat: 'halfmask', body: 'trench', weapon: 'gunblade', cape: '#5a1a5a', g1: '#e0e0d8', g2: '#6a2a8a', glow: '#c060ff' }),
      // Drawpom: Draw points and Guardian Forces
      e5_draw_adept: J('Draw Adept', 'redmage', { hat: 'hoodcape', body: 'satchel', weapon: 'orb', g1: '#c03050', g2: '#60c0ff' }),
      e5_junctioner: J('Junctioner', 'redmage', { hat: 'runecirclet', body: 'magiccape', weapon: 'wand', g1: '#a02040', g2: '#ffd060' }),
      e5_guardian_force: J('Guardian Force', 'summoner', { hat: 'flamecrown', body: 'mantle', weapon: 'ringstaff', g1: '#d04020', g2: '#ffc040', extra: ['wisps'] }),
      // Triadmog: Triple Triad
      e5_card_player: J('Card Player', 'redmage', { hat: 'newsboy', body: 'vest', weapon: 'cards', g1: '#3a6ab0', g2: '#f0e0b0' }),
      e5_card_queen: J('Card Queen', 'redmage', { hat: 'tiara', body: 'gown', weapon: 'cards', cape: '#6a2a8a', g1: '#7a3aa0', g2: '#f0d060' }),
      // Crampmog: Laguna
      e5_private: J('Private', 'ranger', { hat: 'armyhelm', body: 'jacket', weapon: 'gatling', g1: '#4a5a3a', g2: '#b8a070' }),
      e5_movie_knight: J('Movie Knight', 'ranger', { hat: 'plumed', body: 'plate', weapon: 'sword', shield: 'kite', g1: '#c03030', g2: '#c8ccd4' }),
      e5_president: J('President', 'ranger', { hat: 'none', body: 'suit', weapon: 'gatling', cape: '#2a3a6a', g1: '#2a3a6a', g2: '#e8e8f0' }),
      // Katalmog: Kiros
      e5_katal_fighter: J('Katal Fighter', 'thief', { hat: 'headwrap', body: 'sash', weapon: 'claw', g1: '#7a2a4a', g2: '#e0c060' }),
      e5_blade_dancer: J('Blade Dancer', 'thief', { hat: 'feather', body: 'toga', weapon: 'claw', cape: '#7a2a4a', g1: '#e8dcc0', g2: '#8a2a5a' }),
      // Hushmog: Ward
      e5_harpoon_guard: J('Harpoon Guard', 'knight', { hat: 'mailcoif', body: 'armor', weapon: 'harpoon', g1: '#5a6a7a', g2: '#c0a060' }),
      e5_janitor: J('Janitor', 'knight', { hat: 'workcap', body: 'overalls', weapon: 'anchor', shield: 'tower', g1: '#4a5a6a', g2: '#e8c040' }),
      // Chasemog: Galbadia's spider robot
      e5_walker_drone: J('Walker Drone', 'machinist', { hat: 'robohead', body: 'clockwork', weapon: 'wrench', g1: '#5a5a62', g2: '#e04030' }),
      e5_spider_tank: J('Spider Tank', 'machinist', { hat: 'robohead2', body: 'tekarmor', weapon: 'gatling', g1: '#3a3a42', g2: '#ff3020' }),
      // Oddimog: Esthar's lab
      e5_lab_assistant: J('Lab Assistant', 'machinist', { hat: 'goggles', body: 'coat', weapon: 'screwdriver', g1: '#e8e8f0', g2: '#3aa0d0' }),
      e5_researcher: J('Researcher', 'machinist', { hat: 'spectacles', body: 'longcoat', weapon: 'raygun', g1: '#f0f0f4', g2: '#40c0e0' }),
      e5_lunar_scientist: J('Lunar Scientist', 'timemage', { hat: 'spacehelm', body: 'starcoat', weapon: 'starglobe', cape: '#3a2a6a', g1: '#2a2a5a', g2: '#80e0ff' }),
      // Sorcepom: the sorceresses
      e5_witchling: J('Witchling', 'blackmage', { hat: 'witch', body: 'dress', weapon: 'wand', g1: '#3a2a4a', g2: '#d040a0' }),
      e5_sorceress: J('Sorceress', 'blackmage', { hat: 'horned', body: 'gown', weapon: 'none', cape: '#1a1a2a', g1: '#1a1a2a', g2: '#e8c040', extra: ['featherwings'] }),
      e5_time_sorceress: J('Time Sorceress', 'timemage', { hat: 'plume', body: 'gown', weapon: 'clockstaff', cape: '#2a1030', g1: '#3a1a3a', g2: '#c8a8ff', extra: ['featherwings'] }),
      // Ragnamog: the red dragon-ship
      e5_flight_cadet: J('Flight Cadet', 'dragoon', { hat: 'goggles', body: 'jacket', weapon: 'spear', g1: '#c03030', g2: '#e8e0c8' }),
      e5_star_pilot: J('Star Pilot', 'dragoon', { hat: 'spacehelm', body: 'spacesuit', weapon: 'lance', g1: '#c02828', g2: '#f0f0f4', extra: ['jetpack'] }),
      e5_ragnarok: J('Ragnarok', 'dragoon', { hat: 'dragonhelm', body: 'scale', weapon: 'lance', cape: '#b01818', g1: '#b01818', g2: '#e8c040', extra: ['dragonwings'] }),
      // Chicomog: Chicobo and the chocobo forests
      e5_chicobo_kid: J('Chicobo Kid', 'beast', { hat: 'chococrest', body: 'scarf', weapon: 'flute', g1: '#f0c020', g2: '#3a8a3a' }),
      e5_chocoboy: J('Chocoboy', 'beast', { hat: 'cap', body: 'vest', weapon: 'crook', g1: '#e8b020', g2: '#3a6ab0' }),
      e5_chocobo_sage: J('Chocobo Sage', 'beast', { hat: 'sage', body: 'robe', weapon: 'crook', cape: '#d8a020', g1: '#f0d040', g2: '#4a8a4a' }),
      // Moombapom: Shumi to Moomba
      e5_shumi_carver: J('Shumi Carver', 'beast', { hat: 'woolhood', body: 'smock', weapon: 'chisel', g1: '#c8b8a0', g2: '#6a5a4a' }),
      e5_moomba: J('Moomba', 'beast', { hat: 'none', body: 'shaggy', weapon: 'claw', g1: '#c03020', g2: '#f0e0c0' }),
      // Pocketmog: Mini Mog
      e5_pocket_pet: J('Pocket Pet', 'freelancer', { hat: 'none', body: 'scarf', weapon: 'bell', g1: '#ff80a0', g2: '#f0e060' }),
      // Bokomog: Boko's little world
      e5_boko_rider: J('Boko Rider', 'dragoon', { hat: 'explorer', body: 'backpack', weapon: 'lance', mount: { kind: 'chocobo' }, g1: '#f0c020', g2: '#5a7a3a' }),
      // Eidomog: Mog the Eidolon
      e5_summoner_pet: J('Summoner Pet', 'freelancer', { hat: 'ribbon', body: 'scarf', weapon: 'flute', g1: '#f080a0', g2: '#ffe0a0' }),
      e5_eidolon: J('Eidolon', 'summoner', { hat: 'horn', body: 'robe', weapon: 'none', g1: '#f4e8ff', g2: '#ff80c0', extra: ['halo'] }),
      e5_holy_eidolon: J('Holy Eidolon', 'summoner', { hat: 'seraph', body: 'mantle', weapon: 'orbstaff', g1: '#fff4e0', g2: '#ffb040', extra: ['sixwings', 'halo'] }),
      // Monty: the Tantalus troupe
      e5_stagehand: J('Stagehand', 'thief', { hat: 'bandana', body: 'vest', weapon: 'dagger', g1: '#3a6aa0', g2: '#c8a060' }),
      e5_troupe_actor: J('Troupe Actor', 'thief', { hat: 'feathercap', body: 'doublet', weapon: 'rapier', g1: '#a02838', g2: '#f0d070' }),
      e5_master_thief: J('Master Thief', 'thief', { hat: 'halfmask', body: 'longcoat', weapon: 'tanto', cape: '#2a3a7a', g1: '#2a3a7a', g2: '#f0c040' }),
      // Mopli: Burmecia's dragoons
      e5_rain_squire: J('Rain Squire', 'dragoon', { hat: 'souwester', body: 'raincoat', weapon: 'spear', g1: '#3a4a8a', g2: '#a8b8c8' }),
      e5_burmecian_lancer: J('Burmecian Lancer', 'dragoon', { hat: 'musketeer', body: 'longcoat', weapon: 'lance', g1: '#b02030', g2: '#e8d8b0' }),
      e5_rain_dragoon: J('Rain Dragoon', 'dragoon', { hat: 'dragonhelm', body: 'scale', weapon: 'spear', cape: '#b02030', g1: '#7a2030', g2: '#e8e8f0', extra: ['dragonpet'] }),
      // Mimoza: Cleyra's harp
      e5_harp_maiden: J('Harp Maiden', 'bard', { hat: 'veil', body: 'robe', weapon: 'harp', g1: '#e8dcc0', g2: '#c08040' }),
      e5_sand_oracle: J('Sand Oracle', 'bard', { hat: 'laurel', body: 'toga', weapon: 'harp', cape: '#d8b070', g1: '#f0e4c8', g2: '#b06030', extra: ['wisps'] }),
      // Mocha: the Qu gourmands
      e5_frog_catcher: J('Frog Catcher', 'beast', { hat: 'straw', body: 'overalls', weapon: 'net', g1: '#5a8a3a', g2: '#e0c070' }),
      e5_gourmand: J('Gourmand', 'beast', { hat: 'grandtoque', body: 'chefcoat', weapon: 'pitchfork', g1: '#f4e8d0', g2: '#5aa040' }),
      // Moorock: the Black Mage village
      e5_mage_doll: J('Mage Doll', 'blackmage', { hat: 'witch', body: 'robe', weapon: 'none', g1: '#3a4a8a', g2: '#c8a060', shadowFace: true, eyes: '#ffe040' }),
      e5_village_mage: J('Village Mage', 'blackmage', { hat: 'witch', body: 'overalls', weapon: 'shovel', g1: '#3a3a5a', g2: '#7a5a30', shadowFace: true, eyes: '#ffd040' }),
      // Moodon: the Knights of Pluto
      e5_pluto_recruit: J('Pluto Recruit', 'knight', { hat: 'kettle', body: 'tabard', weapon: 'shortsword', g1: '#8a8e98', g2: '#3a5aa0' }),
      e5_pluto_knight: J('Pluto Knight', 'knight', { hat: 'helm', body: 'plate', weapon: 'sword', shield: 'round', g1: '#9aa0aa', g2: '#3a4a8a' }),
      e5_pluto_captain: J('Pluto Captain', 'knight', { hat: 'bascinet', body: 'plate', weapon: 'excalibur', cape: '#3a4a9a', g1: '#a8aeb8', g2: '#d8b040', glow: '#a0d0ff' }),
      // Serino: Alexandria's soldiers and their general
      e5_palace_guard: J('Palace Guard', 'warrior', { hat: 'sallet', body: 'armor', weapon: 'saber', g1: '#c03040', g2: '#e8e0d0' }),
      e5_general: J('General', 'warrior', { hat: 'crest', body: 'armor', weapon: 'holysword', cape: '#c03040', g1: '#e8e0d8', g2: '#c03040' }),
      // Mogrich: Lindblum's airships
      e5_engine_hand: J('Engine Hand', 'machinist', { hat: 'engcap', body: 'overalls', weapon: 'wrench', g1: '#8a6a3a', g2: '#d8c070' }),
      e5_airship_engineer: J('Airship Engineer', 'machinist', { hat: 'goggles', body: 'toolbelt', weapon: 'drill', g1: '#6a4a2a', g2: '#e0b040' }),
      e5_regent: J('Regent', 'machinist', { hat: 'captain', body: 'tailcoat', weapon: 'cannon', cape: '#5a3a1a', g1: '#2a2a3a', g2: '#d8b040' }),
      // Mozme: Treno's card game
      e5_card_shark: J('Card Shark', 'thief', { hat: 'domino', body: 'waistcoat', weapon: 'cards', g1: '#2a2a4a', g2: '#c0a0f0' }),
      e5_card_noble: J('Card Noble', 'thief', { hat: 'tophat', body: 'tailcoat', weapon: 'cards', cape: '#3a1a4a', g1: '#2a1a3a', g2: '#e8c040' }),
      // Moguta: Chocobo Hot and Cold
      e5_treasure_digger: J('Treasure Digger', 'beast', { hat: 'bandana', body: 'overalls', weapon: 'shovel', g1: '#e8b020', g2: '#5a7aa0' }),
      e5_chocographer: J('Chocographer', 'beast', { hat: 'pith', body: 'safari', weapon: 'spade', g1: '#d8b878', g2: '#c03030' }),
      // Moonte: the Ragtime Mouse's quiz
      e5_quizmaster: J('Quizmaster', 'bard', { hat: 'tophat', body: 'tuxedo', weapon: 'microphone', g1: '#2a2a2a', g2: '#e8c040' }),
      // Mogki: the Mognet couriers
      e5_letter_carrier: J('Letter Carrier', 'freelancer', { hat: 'cap', body: 'satchel', weapon: 'scroll', g1: '#d84040', g2: '#f0e0b0' }),
      e5_mognet_courier: J('Mognet Courier', 'freelancer', { hat: 'propeller', body: 'satchel', weapon: 'scroll', g1: '#3a6ad0', g2: '#f0d040', extra: ['jetpack'] }),
      // Suzuna: the moogles who keep your diary
      e5_diary_keeper: J('Diary Keeper', 'whitemage', { hat: 'kerchief', body: 'satchel', weapon: 'book', g1: '#f0e8d0', g2: '#c04060' }),
      e5_save_keeper: J('Save Keeper', 'whitemage', { hat: 'hood', body: 'robe', weapon: 'lantern', g1: '#f8f0e0', g2: '#40a0ff', extra: ['halo'] }),
      // Momatose: the sleepy one
      e5_napper: J('Napper', 'freelancer', { hat: 'nightcap', body: 'fleece', weapon: 'candle', g1: '#6a7ad0', g2: '#f0e8c0' }),
      e5_dreamwalker: J('Dreamwalker', 'freelancer', { hat: 'sheephat', body: 'cloak', weapon: 'candle', g1: '#3a3a7a', g2: '#c0c8ff', extra: ['wisps'] }),
      // Booyamog: the cafeteria hot dogs and the combos
      e5_hotdog_fan: J('Hot Dog Fan', 'monk', { hat: 'sweatband', body: 'tanktop', weapon: 'gloves', g1: '#2a4a8a', g2: '#e8e0d0' }),
      e5_duelist: J('Duelist', 'monk', { hat: 'mohawk', body: 'jacket', weapon: 'cestus', g1: '#1a1a22', g2: '#3a7ad0' }),
    },

    // ---------------------------------------------------------------- signature moves (4)
    moves: {
      e5_junction: { name: 'Junction', type: 'summoner', power: 0, acc: true, cd: 3, self: { atk: 1, mag: 1, res: 1 }, desc: 'Binds a guardian spirit to itself: Attack, Magic and Resistance up.' },
      e5_maelstrom: { name: 'Maelstrom', type: 'blackmage', power: 0, cat: 'magic', acc: 90, cd: 3, fixed: 'half', status: ['slow', 30], desc: "A sorceress's black whirlpool: takes half the foe's HP. May Slow." },
      e5_strafing_run: { name: 'Strafing Run', type: 'dragoon', power: 45, acc: 100, cd: 2, hits: 2, self: { spd: 1 }, flags: ['bullet'], desc: 'Two low passes, guns blazing: hits twice, then its Speed rises.' },
      e5_terra_homing: { name: 'Terra Homing', type: 'summoner', power: 100, acc: true, cd: 3, flags: ['pulse'], desc: 'A holy eidolon fires homing light from far away. It never misses.' },
    },

    // ---------------------------------------------------------------- signature abilities (2)
    abilities: {
      e5_trance: { name: 'Trance', desc: 'At 1/3 HP or less: own-type moves 1.5x and Speed 1.5x.', boost: { types: ['own'], mul: 1.5, below: 0.34 }, pinchSpd: 1.5 },
      e5_draw: { name: 'Draw', desc: 'It draws power from spells: a magic hit raises its Magic.', whenHit: [{ cat: 'magic', boosts: { mag: 1 } }] },
    },

    // ---------------------------------------------------------------- species (line by line)
    species: {
      // ======== FF VIII ========
      // Seedmog (Garden Cadet > SeeD > Commander): the Garden's mercenary cadets, guardian spirits junctioned
      seedmog_cadet: S('Seedmog', 'e5_cadet', B(50, 55, 45, 40, 40, 50), { ...C.seed, rate: 190, exp: 58, curve: 'medium', evo: { at: 16, to: 'seedmog_seed' },
        desc: 'Studies for the field exam between naps and hot dogs. Its practice sword never once leaves the scabbard on time.',
        abilities: ['fast_learner', 'battle_ready', 'limit_break'],
        learn: '1 pom_bop, 1 pout, 4 bokken, 7 errand_run, 10 kupo_toss, 13 accumulate, 15 bokken',
        habitat: 'town', rarity: 'common' }),
      seedmog_seed: S('Seedmog', 'e5_seed', B(65, 80, 60, 60, 55, 70), { type2: 'summoner', ...C.seed, rate: 90, exp: 138, curve: 'medium', evo: { at: 34, to: 'seedmog_commander' },
        desc: 'Passed its field exam in a cave full of fire. It salutes everyone, doors included, and junctions a spirit before breakfast.',
        abilities: ['fast_learner', 'battle_ready', 'limit_break'],
        learn: '16 e5_junction, 19 slash, 22 blade_beam, 25 karma_knife, 28 slash, 31 cross_slash',
        habitat: 'town', rarity: 'common' }),
      seedmog_commander: S('Seedmog', 'e5_commander', B(80, 105, 75, 80, 70, 90), { type2: 'summoner', ...C.seed, rate: 45, exp: 236, curve: 'medium',
        desc: 'Leads a whole flying school into battle, then goes very quiet about it. Its speeches are short. Mostly "Whatever."',
        abilities: ['fast_learner', 'battle_ready', 'limit_break'],
        learn: '34 braver, 37 slash, 41 hellfire, 47 omnislash',
        habitat: 'town', rarity: 'common' }),

      // Scarmog (Disciplinarian > Gunblade Rival > Sorceress Knight): the scarred rival with the gunblade
      scarmog_disciplinarian: S('Scarmog', 'e5_disciplinarian', B(45, 65, 40, 40, 35, 60), { ...C.scar, rate: 160, exp: 60, curve: 'medium', evo: { at: 18, to: 'scarmog_rival' },
        desc: 'Runs the discipline committee and writes up anyone caught running in the halls. It runs in the halls constantly.',
        abilities: ['menace', 'defiance'],
        learn: '1 slash, 1 warcry, 4 tomahawk, 7 provoke, 10 slash, 13 maim, 16 bravery',
        habitat: 'beach', rarity: 'uncommon' }),
      scarmog_rival: S('Scarmog', 'e5_gunblade_rival', B(60, 95, 55, 55, 50, 85), { type2: 'machinist', ...C.scar, rate: 80, exp: 140, curve: 'medium', evo: { at: 36, to: 'scarmog_knight' },
        desc: 'Picks a fight with any moogle holding a gunblade. Its scar matches its rival\'s exactly, which annoys them both.',
        abilities: ['menace', 'defiance'],
        learn: '18 burst_strike, 21 keen_edge, 24 slash, 27 blade_beam, 31 inner_release, 33 tomahawk',
        habitat: 'beach', rarity: 'uncommon' }),
      scarmog_knight: S('Scarmog', 'e5_sorceress_knight', B(75, 125, 65, 85, 60, 100), { type2: 'blackmage', ...C.scar, rate: 45, exp: 240, curve: 'medium',
        desc: 'Swore itself to a sorceress for a romantic dream. These days it goes fishing with two old pals and says it never left.',
        abilities: ['menace', 'defiance'],
        learn: '36 flame_rod, 39 slash, 42 burst_strike, 45 fell_cleave',
        habitat: 'beach', rarity: 'uncommon' }),

      // Drawpom (Draw Adept > Junctioner > Guardian Force): magic drawn from springs, spirits bound on
      drawpom_adept: S('Drawpom', 'e5_draw_adept', B(45, 30, 40, 65, 55, 55), { ...C.draw, rate: 170, exp: 60, curve: 'medium', evo: { at: 20, to: 'drawpom_junctioner' },
        desc: 'Pulls sparks of magic out of glowing springs and stores them in its cheeks. It hiccups fire when it gets excited.',
        abilities: ['e5_draw', 'magic_up'],
        learn: '1 jolt, 1 dispel_spell, 4 verstone, 8 aspir, 11 jolt, 14 mind_blast, 17 dualcast, 19 verstone',
        habitat: 'volcano', rarity: 'uncommon' }),
      drawpom_junctioner: S('Drawpom', 'e5_junctioner', B(60, 45, 55, 90, 75, 75), { type2: 'summoner', ...C.draw, rate: 90, exp: 140, curve: 'medium', evo: { at: 35, to: 'drawpom_guardian' },
        desc: 'Binds a spirit to its own pom-pom for strength. It forgets a little each time, like birthdays and where it lives.',
        abilities: ['e5_draw', 'magic_up'],
        learn: '20 e5_junction, 23 searing_light, 26 verstone, 29 verthunder, 32 delta_attack',
        habitat: 'volcano', rarity: 'uncommon' }),
      drawpom_guardian: S('Drawpom', 'e5_guardian_force', B(80, 55, 70, 120, 95, 90), { type2: 'redmage', ...C.draw, rate: 45, exp: 236, curve: 'medium',
        desc: 'A blazing guardian spirit in moogle form. It lives deep in a fire cavern and grumbles about the cold whenever it is called.',
        abilities: ['e5_draw', 'magic_up'],
        learn: '35 hellfire, 38 jolt, 41 diamond_dust, 44 leaf_gust, 47 calamity',
        habitat: 'volcano', rarity: 'uncommon' }),

      // Triadmog (Card Player > Card Queen): Triple Triad, and its ever-changing rules
      triadmog_player: S('Triadmog', 'e5_card_player', B(50, 40, 45, 60, 50, 60), { ...C.triad, rate: 180, exp: 58, curve: 'medium', evo: { at: 24, to: 'triadmog_queen' },
        desc: 'Challenges every moogle it meets to a card game. It has a rule for everything and invents new ones when it starts losing.',
        abilities: ['kupo_luck', 'libra', 'wild_card'],
        learn: '1 card_trick, 1 en_garde, 5 dice, 9 mind_blast, 12 card_trick, 15 element_orb, 18 hat_trick, 21 dice',
        habitat: 'sea', rarity: 'common' }),
      triadmog_queen: S('Triadmog', 'e5_card_queen', B(70, 60, 65, 100, 75, 100), { type2: 'thief', ...C.triad, rate: 70, exp: 205, curve: 'medium',
        desc: 'Sails from port to port spreading strange new card rules. Wherever it docks, everybody\'s favourite card goes missing.',
        abilities: ['kupo_luck', 'libra', 'wild_card'],
        learn: '24 shift_break, 27 card_trick, 31 resolution_spell, 34 sleight_of_hand, 38 cloak_dagger, 42 grand_heist, 46 verflare',
        habitat: 'sea', rarity: 'common' }),

      // Crampmog (Private > Movie Knight > President): the soldier with the leg cramp who ended up in charge
      crampmog_private: S('Crampmog', 'e5_private', B(50, 60, 45, 35, 40, 55), { ...C.cramp, rate: 170, exp: 60, curve: 'medium', evo: { at: 17, to: 'crampmog_knight' },
        desc: 'A cheerful soldier whose leg cramps up whenever someone pretty looks its way. It fires its machine gun mostly at clouds.',
        abilities: ['rapid_fire', 'fight_or_flight'],
        learn: '1 buckshot, 1 hunters_mark, 4 snap_shot, 7 leg_shot, 10 buckshot, 13 aim, 16 twin_arrow',
        habitat: 'forest', rarity: 'uncommon' }),
      crampmog_knight: S('Crampmog', 'e5_movie_knight', B(70, 85, 70, 45, 55, 70), { type2: 'knight', ...C.cramp, rate: 90, exp: 140, curve: 'medium', evo: { at: 33, to: 'crampmog_president' },
        desc: 'Starred in a monster movie as a brave knight and beat the dragon in one take. It still signs autographs in costume.',
        abilities: ['rapid_fire', 'fight_or_flight'],
        learn: '17 valiant, 20 buckshot, 23 sharpshot, 26 shield_bash, 29 cover, 32 dark_shot',
        habitat: 'forest', rarity: 'uncommon' }),
      crampmog_president: S('Crampmog', 'e5_president', B(90, 110, 80, 60, 70, 90), { type2: 'bard', ...C.cramp, rate: 45, exp: 238, curve: 'medium',
        desc: 'Somehow ended up running a whole high-tech city. Its speeches wander off topic, but the crowds love it anyway.',
        abilities: ['rapid_fire', 'fight_or_flight'],
        learn: '33 heckle_riff, 37 sonic_chord, 41 twin_shot, 44 buckshot, 47 broadside',
        habitat: 'forest', rarity: 'uncommon' }),

      // Katalmog (Katal Fighter > Blade Dancer): the smooth one with a blade on each paw
      katalmog_fighter: S('Katalmog', 'e5_katal_fighter', B(45, 65, 40, 40, 40, 75), { ...C.katal, rate: 160, exp: 60, curve: 'medium', evo: { at: 22, to: 'katalmog_dancer' },
        desc: 'Fights with a blade on each paw and never stops dancing. It keeps its clumsy best friend out of trouble, a full-time job.',
        abilities: ['finesse', 'sylph_dance'],
        learn: '1 kunai, 1 trip, 5 quickhit, 8 viper_fang, 11 kunai, 14 snowman_jazz, 17 prowl, 20 kunai',
        habitat: 'desert', rarity: 'uncommon' }),
      katalmog_dancer: S('Katalmog', 'e5_blade_dancer', B(65, 105, 55, 60, 55, 120), { type2: 'bard', ...C.katal, rate: 70, exp: 210, curve: 'medium',
        desc: 'Whirls through foes in a blur of steel and silk. It talks smoothly, moves smoother, and is never once out of breath.',
        abilities: ['finesse', 'sylph_dance'],
        learn: '22 dusk_requiem, 25 kunai, 28 backstab, 31 wind_song, 34 sword_dance, 37 kunai, 41 turn_the_blade, 45 throw',
        habitat: 'desert', rarity: 'uncommon' }),

      // Hushmog (Harpoon Guard > Janitor): the big quiet one
      hushmog_guard: S('Hushmog', 'e5_harpoon_guard', B(75, 65, 70, 25, 45, 25), { ...C.hush, rate: 150, exp: 62, curve: 'slow', evo: { at: 26, to: 'hushmog_janitor' },
        desc: 'A huge moogle with a huge harpoon who stopped talking after a bad fall. It nods a lot, and it means every nod.',
        abilities: ['stand_firm', 'heavy_armor', 'zen_mind'],
        learn: '1 shield_bash, 1 cover, 5 rend_armor, 9 harpoon, 13 shield_bash, 17 hold_the_line, 21 aegis_slam, 24 shield_bash',
        habitat: 'sea', rarity: 'common' }),
      hushmog_janitor: S('Hushmog', 'e5_janitor', B(115, 105, 110, 35, 75, 30), { type2: 'freelancer', ...C.hush, rate: 70, exp: 212, curve: 'slow',
        desc: 'Mops the floors of a desert prison with a ship\'s anchor. Nobody asks why. The floors have never been cleaner.',
        abilities: ['stand_firm', 'heavy_armor', 'zen_mind'],
        learn: '26 anchor_drop, 29 mop_up, 32 pom_bop, 35 sentinel, 38 juggernaut, 42 shield_bash, 46 entrench',
        habitat: 'sea', rarity: 'common' }),

      // Chasemog (Walker Drone > Spider Tank): the robot that will not stop chasing you
      chasemog_drone: S('Chasemog', 'e5_walker_drone', B(55, 70, 70, 30, 40, 45), { ...C.chase, rate: 150, exp: 62, curve: 'medium', evo: { at: 25, to: 'chasemog_tank' },
        desc: 'A little army robot that follows anyone who walks past the base. It is not sure why, but it is very committed.',
        abilities: ['stand_firm', 'auto_potion'],
        learn: '1 wrench, 1 blue_screw, 4 rivet_gun, 8 scattergun, 12 wrench, 15 auto_crossbow, 18 spider_silk, 21 wrench',
        habitat: 'factory', rarity: 'uncommon' }),
      chasemog_tank: S('Chasemog', 'e5_spider_tank', B(80, 110, 105, 45, 60, 80), { type2: 'beast', ...C.chase, rate: 65, exp: 214, curve: 'medium',
        desc: 'A great iron spider that chases intruders across the whole map. Knock it flat and it gets back up. Every. Single. Time.',
        abilities: ['stand_firm', 'auto_potion'],
        learn: '25 naga_fang, 28 rivet_gun, 31 piston_punch, 34 eureka, 38 bite, 42 chainsaw, 46 satellite_beam',
        habitat: 'factory', rarity: 'uncommon' }),

      // Oddimog (Lab Assistant > Researcher > Lunar Scientist): Esthar's lab and the moon it studies
      oddimog_assistant: S('Oddimog', 'e5_lab_assistant', B(45, 30, 45, 65, 55, 50), { ...C.oddi, rate: 170, exp: 58, curve: 'medium', evo: { at: 19, to: 'oddimog_researcher' },
        desc: 'Fetches tea and screwdrivers for a very strange professor. It writes everything down, even when the professor sneezes.',
        abilities: ['libra', 'mana_shield'],
        learn: '1 tracer_beam, 1 hush, 4 starlight, 8 shrink_ray, 12 tracer_beam, 15 slow, 18 arc_relay',
        habitat: 'crater', rarity: 'uncommon' }),
      oddimog_researcher: S('Oddimog', 'e5_researcher', B(60, 40, 60, 95, 75, 70), { type2: 'timemage', ...C.oddi, rate: 90, exp: 140, curve: 'medium', evo: { at: 34, to: 'oddimog_scientist' },
        desc: 'Studies magic by poking it with gadgets until it pokes back. Its lab coat has a burn in the shape of every spell.',
        abilities: ['libra', 'mana_shield'],
        learn: '19 gravity, 22 tracer_beam, 25 meditation, 28 cold_front, 31 tick_tock, 33 demi_spell',
        habitat: 'crater', rarity: 'uncommon' }),
      oddimog_scientist: S('Oddimog', 'e5_lunar_scientist', B(75, 50, 75, 125, 90, 85), { type2: 'machinist', ...C.oddi, rate: 45, exp: 236, curve: 'medium',
        desc: 'Built a machine to read the moon\'s mind. The moon answered by dropping monsters on it. It counts that as a result.',
        abilities: ['libra', 'mana_shield'],
        learn: '34 comet, 37 tracer_beam, 41 gravity_well, 44 starfall, 47 meteor',
        habitat: 'crater', rarity: 'uncommon' }),

      // Sorcepom (Witchling > Sorceress > Time Sorceress): the sorceresses, and the one who wants all time at once
      sorcepom_witchling: S('Sorcepom', 'e5_witchling', B(45, 25, 40, 70, 60, 55), { ...C.sorce, rate: 150, exp: 64, curve: 'medium', evo: { at: 22, to: 'sorcepom_sorceress' },
        desc: 'Woke up one morning with a sorceress\'s power and a very big hat. It is trying very hard to be one of the nice ones.',
        abilities: ['wounded_pride', 'mana_surge', 'magic_eater'],
        learn: '1 fire, 1 mini_spell, 4 blizzard, 8 scathe, 11 fire, 14 sharpcast, 17 drain, 20 scathe',
        habitat: 'night', rarity: 'rare' }),
      sorcepom_sorceress: S('Sorcepom', 'e5_sorceress', B(60, 35, 55, 100, 80, 75), { type2: 'timemage', ...C.sorce, rate: 75, exp: 150, curve: 'medium', evo: { at: 38, to: 'sorcepom_time' },
        desc: 'Feathered wings burst out of its back when it gets cross. A knight swore to protect it, which helps with the shopping.',
        abilities: ['wounded_pride', 'mana_surge', 'magic_eater'],
        learn: '22 e5_maelstrom, 25 blizzara, 28 second_hand, 31 thundara, 34 slowga, 36 fire',
        habitat: 'night', rarity: 'rare' }),
      sorcepom_time: S('Sorcepom', 'e5_time_sorceress', B(80, 45, 65, 135, 100, 95), { type2: 'blackmage', ...C.sorce, rate: 35, exp: 250, curve: 'medium',
        desc: 'Wants to squash all of time into one moment so it never has to wait in a queue again. Patience was never its strength.',
        abilities: ['time_compression', 'mana_surge', 'magic_eater'],
        learn: '38 chronosphere, 41 starfall, 44 second_hand, 47 ultima',
        habitat: 'night', rarity: 'rare' }),

      // Ragnamog (Flight Cadet > Star Pilot > Ragnarok): the pseudo-legendary red dragon-ship
      ragnamog_cadet: S('Ragnamog', 'e5_flight_cadet', B(55, 70, 50, 40, 40, 45), { ...C.ragna, rate: 45, exp: 62, curve: 'slow', class: 'pseudo', evo: { at: 30, to: 'ragnamog_pilot' },
        desc: 'Dreams of flying the big red ship and practises in a cardboard box. It already makes the engine noise perfectly.',
        abilities: ['pom_wings', 'mythril_scales', 'wyvern_wings'],
        learn: '1 thrust, 1 tailwind, 5 pom_lance, 9 leg_sweep, 13 thrust, 17 lancet, 21 wyrm_dance, 25 pom_lance, 28 harpoon',
        habitat: 'sky', rarity: 'rare' }),
      ragnamog_pilot: S('Ragnamog', 'e5_star_pilot', B(75, 100, 75, 55, 60, 65), { type2: 'machinist', ...C.ragna, rate: 45, exp: 145, curve: 'slow', class: 'pseudo', evo: { at: 44, to: 'ragnamog_ragnarok' },
        desc: 'Took the controls of a ship left drifting in space. It flew home the long way, round the moon, just to see it.',
        abilities: ['pom_wings', 'mythril_scales', 'wyvern_wings'],
        learn: '30 air_anchor, 33 thrust, 36 jump, 39 rivet_gun, 42 e5_strafing_run',
        habitat: 'sky', rarity: 'rare' }),
      ragnamog_ragnarok: S('Ragnamog', 'e5_ragnarok', B(100, 140, 105, 75, 85, 100), { type2: 'machinist', ...C.ragna, rate: 45, exp: 260, curve: 'slow', class: 'pseudo',
        desc: 'Has become one with its red dragon-ship. It cruises above the clouds, and whole cities duck when it banks.',
        abilities: ['pom_wings', 'mythril_scales', 'wyvern_wings'],
        learn: '44 stardiver, 46 dragon_fang, 48 thrust',
        habitat: 'sky', rarity: 'rare' }),

      // Chicomog (Chicobo Kid > Chocoboy > Chocobo Sage): the chocobo forests
      chicomog_kid: S('Chicomog', 'e5_chicobo_kid', B(50, 55, 45, 40, 45, 65), { ...C.chico, rate: 200, exp: 55, curve: 'fast', evo: { at: 16, to: 'chicomog_chocoboy' },
        desc: 'Blows a whistle in the woods until the baby chicobos come out. They always come out, mostly to tell it to stop.',
        abilities: ['auto_haste', 'second_wind'],
        learn: '1 choco_kick, 1 roar, 4 wing_flutter, 8 quicksand, 11 choco_kick, 14 nimble_pounce',
        habitat: 'grass', rarity: 'common' }),
      chicomog_chocoboy: S('Chicomog', 'e5_chocoboy', B(65, 80, 60, 55, 60, 90), { ...C.chico, rate: 100, exp: 135, curve: 'fast', evo: { at: 32, to: 'chicomog_sage' },
        desc: 'Rents out chocobos by the hour and sells whistles on the side. Its prices go up every time you ask a question.',
        abilities: ['auto_haste', 'second_wind'],
        learn: '16 chocobo_rush, 19 choco_kick, 22 tanglevine, 25 trailblaze, 28 moon_howl, 31 choco_kick',
        habitat: 'grass', rarity: 'common' }),
      chicomog_sage: S('Chicomog', 'e5_chocobo_sage', B(85, 105, 75, 80, 80, 110), { type2: 'whitemage', ...C.chico, rate: 50, exp: 232, curve: 'fast',
        desc: 'An old, wise moogle who lives where the chocobos gather. It knows a thousand chocobo secrets and shares them in riddles.',
        abilities: ['auto_haste', 'field_medic'],
        learn: '32 holy_mace, 35 cure, 38 choco_kick, 44 choco_meteor',
        habitat: 'grass', rarity: 'common' }),

      // Moombapom (Shumi Carver > Moomba): a Shumi that grew red fur
      moombapom_carver: S('Moombapom', 'e5_shumi_carver', B(60, 60, 50, 35, 45, 50), { ...C.moomba, rate: 190, exp: 56, curve: 'fast', evo: { at: 21, to: 'moombapom_moomba' },
        desc: 'Carves statues in a snowy village and feels it was meant for more. Lately it has been growing a lot of red fur.',
        abilities: ['pom_fluff', 'thick_wool'],
        learn: '1 bite, 1 roar, 4 kick, 8 quicksand, 12 bite, 15 wool, 18 paw_swat, 20 kick',
        habitat: 'snow', rarity: 'common' }),
      moombapom_moomba: S('Moombapom', 'e5_moomba', B(90, 100, 75, 45, 70, 80), { type2: 'monk', ...C.moomba, rate: 80, exp: 208, curve: 'fast',
        desc: 'A furry red moogle that knows exactly one word, which is somebody\'s name. It shouts it with joy at total strangers.',
        abilities: ['pom_fluff', 'thick_wool'],
        learn: '21 one_inch_punch, 24 combo_chain, 27 chakra, 30 bite, 33 gaia_rage, 37 kiai, 41 combo_chain, 45 stampede',
        habitat: 'snow', rarity: 'common' }),

      // Pocketmog (Pocket Pet): Mini Mog, small enough for a pocket
      pocketmog_pet: S('Pocketmog', 'e5_pocket_pet', B(70, 50, 60, 80, 85, 105), { type2: 'whitemage', ...C.pocket, rate: 90, exp: 175, curve: 'medium',
        desc: 'Small enough to live in a pocket and mend a whole team. It insists it is the original moogle. Nobody can prove otherwise.',
        abilities: ['pom_prank', 'healing_pom', 'blink_image'],
        learn: '1 pom_bop, 1 pout, 5 banish, 9 pom_dust, 13 pom_bop, 17 potion, 21 mini_spell, 24 holy_glare, 28 mog_shield, 32 kupo_holler, 36 holy_glare, 40 mog_mirror, 44 regen_spell, 47 holy',
        habitat: 'grass', rarity: 'uncommon' }),

      // Bokomog (Boko Rider): a chocobo's adventures in a world that fits in your hand
      bokomog_rider: S('Bokomog', 'e5_boko_rider', B(75, 105, 70, 50, 65, 110), { type2: 'beast', ...C.boko, rate: 55, exp: 180, curve: 'medium',
        desc: 'Rides a chocobo through a little world that fits in your hand. It comes back with treasure, scuffed boots and long stories.',
        abilities: ['first_strike', 'kupo_luck'],
        learn: '1 choco_kick, 1 tailwind, 5 thrust, 9 hurdle, 13 choco_kick, 17 leg_sweep, 21 nimble_pounce, 25 thrust, 29 wyrm_dance, 33 chocobo_rush, 37 choco_kick, 41 dive_bomb, 45 choco_meteor, 48 hurdle',
        habitat: 'mountain', rarity: 'rare' }),

      // Booyamog (Hot Dog Fan > Duelist): the hot dogs, and the combos
      booyamog_fan: S('Booyamog', 'e5_hotdog_fan', B(50, 70, 45, 30, 40, 70), { ...C.booya, rate: 170, exp: 60, curve: 'medium', evo: { at: 20, to: 'booyamog_duelist' },
        desc: 'Sprints to the cafeteria every lunchtime for the hot dogs. They are always sold out, and it never stops trying.',
        abilities: ['iron_fist', 'brawler_soul', 'hand_to_hand'],
        learn: '1 combo_chain, 1 pout, 4 quick_jab, 8 mach_kick, 11 choco_kick, 14 combo_chain, 17 snack_break, 19 dolphin_blow',
        habitat: 'town', rarity: 'common' }),
      booyamog_duelist: S('Booyamog', 'e5_duelist', B(70, 115, 65, 40, 60, 120), { ...C.booya, rate: 75, exp: 212, curve: 'medium',
        desc: 'Kicks and punches in combos so fast it shouts their names afterwards. It saves its biggest blow for when it feels heroic.',
        abilities: ['iron_fist', 'brawler_soul', 'hand_to_hand'],
        learn: '20 burning_rave, 23 quick_jab, 26 heel_drop, 29 kiai, 32 combo_chain, 35 one_inch_punch, 38 suplex, 42 choco_kick, 46 final_heaven',
        habitat: 'town', rarity: 'common' }),

      // ======== FF IX ========
      // Eidomog (Summoner Pet > Eidolon > Holy Eidolon): Mog, the little moogle who was a great Eidolon all along
      eidomog_pet: S('Eidomog', 'e5_summoner_pet', B(50, 35, 45, 60, 60, 50), { ...C.eido, rate: 150, exp: 62, curve: 'medium', evo: { at: 18, to: 'eidomog_eidolon' },
        desc: 'A young summoner\'s best friend, always tucked under her arm. It squeaks kupo at every danger, then hides in her hair.',
        abilities: ['summon_bond', 'charm'],
        learn: '1 pom_bop, 1 snack_break, 4 banish, 8 pom_dust, 11 pom_bop, 14 kupo_holler, 17 leaf_gust',
        habitat: 'lifestream', rarity: 'rare' }),
      eidomog_eidolon: S('Eidomog', 'e5_eidolon', B(65, 45, 60, 90, 85, 70), { ...C.eido, rate: 70, exp: 145, curve: 'medium', evo: { at: 36, to: 'eidomog_holy' },
        desc: 'Turned out to be a great spirit hiding in a little moogle all along. It still prefers to be carried, thank you.',
        abilities: ['summon_bond', 'charm'],
        learn: '18 searing_light, 21 sylph_breeze, 24 leaf_gust, 27 mist_dragon, 30 banish, 33 judgment_bolt',
        habitat: 'lifestream', rarity: 'rare' }),
      eidomog_holy: S('Eidomog', 'e5_holy_eidolon', B(85, 55, 75, 125, 110, 85), { type2: 'whitemage', ...C.eido, rate: 40, exp: 245, curve: 'medium',
        desc: 'Shows its true holy form to protect its friend. The light is blinding, and its hugs are much harder to escape.',
        abilities: ['summon_bond', 'charm'],
        learn: '36 holy_glare, 39 regen_spell, 42 e5_terra_homing, 45 leaf_gust, 48 holy',
        habitat: 'lifestream', rarity: 'rare' }),

      // Monty (Stagehand > Troupe Actor > Master Thief): the Tantalus theatre troupe
      monty_stagehand: S('Monty', 'e5_stagehand', B(45, 60, 40, 40, 40, 70), { ...C.monty, rate: 180, exp: 58, curve: 'medium', evo: { at: 17, to: 'monty_actor' },
        desc: 'Pulls ropes backstage and borrows wallets from the audience during the big swordfight. It always puts them back. Mostly.',
        abilities: ['sneak_attack', 'coin_up', 'featherweight'],
        learn: '1 steal, 1 trip, 4 quickhit, 7 cutlass, 10 steal, 13 smoke, 16 thievery',
        habitat: 'town', rarity: 'common' }),
      monty_actor: S('Monty', 'e5_troupe_actor', B(60, 85, 55, 55, 55, 95), { type2: 'bard', ...C.monty, rate: 90, exp: 140, curve: 'medium', evo: { at: 34, to: 'monty_master' },
        desc: 'Plays the hero in a famous play about a canary. It forgets its lines, but never forgets where you keep your nuts.',
        abilities: ['sneak_attack', 'coin_up', 'featherweight'],
        learn: '17 cymbal_crash, 20 steal, 23 heckle_riff, 26 trick_attack, 29 knife_juggle, 32 cutlass',
        habitat: 'town', rarity: 'common' }),
      monty_master: S('Monty', 'e5_master_thief', B(75, 115, 65, 70, 65, 125), { type2: 'bard', ...C.monty, rate: 45, exp: 238, curve: 'medium',
        desc: 'A charming thief with a tail it swears is part of the costume. It steals hearts, held items and every show it is in.',
        abilities: ['sneak_attack', 'e5_trance', 'featherweight'],
        learn: '34 coup_de_grace, 37 quickhit, 40 bunshin, 43 dusk_requiem, 46 grand_heist',
        habitat: 'town', rarity: 'common' }),

      // Mopli (Rain Squire > Burmecian Lancer > Rain Dragoon): the dragoons of the kingdom of rain
      mopli_squire: S('Mopli', 'e5_rain_squire', B(50, 65, 45, 35, 45, 55), { ...C.mopli, rate: 160, exp: 60, curve: 'medium', evo: { at: 19, to: 'mopli_lancer' },
        desc: 'Comes from a kingdom where it never stops raining. It has never seen its own shadow and finds other moogles\' rude.',
        abilities: ['dragon_spirit', 'avenger'],
        learn: '1 thrust, 1 spear_wall, 4 hurdle, 8 lancet, 11 thrust, 14 leg_sweep, 17 dragons_crest',
        habitat: 'swamp', rarity: 'uncommon' }),
      mopli_lancer: S('Mopli', 'e5_burmecian_lancer', B(65, 95, 60, 50, 60, 75), { ...C.mopli, rate: 85, exp: 142, curve: 'medium', evo: { at: 35, to: 'mopli_dragoon' },
        desc: 'Leaps higher than the rain falls. Its big red hat somehow never gets wet, and it is extremely proud of that.',
        abilities: ['dragon_spirit', 'avenger'],
        learn: '19 soul_jump, 22 thrust, 25 harpoon, 28 lance_charge, 31 pom_lance, 33 jump',
        habitat: 'swamp', rarity: 'uncommon' }),
      mopli_dragoon: S('Mopli', 'e5_rain_dragoon', B(85, 125, 75, 70, 80, 95), { type2: 'whitemage', ...C.mopli, rate: 45, exp: 240, curve: 'medium',
        desc: 'Fights on for a fallen kingdom with little dragons circling its spear. When it jumps, the clouds part to let it through.',
        abilities: ['e5_trance', 'avenger'],
        learn: '35 reiss_wind, 38 holy_mace, 41 thrust, 44 dragon_fang, 47 high_jump',
        habitat: 'swamp', rarity: 'uncommon' }),

      // Mimoza (Harp Maiden > Sand Oracle): the harp that keeps the sandstorm turning
      mimoza_maiden: S('Mimoza', 'e5_harp_maiden', B(55, 35, 50, 60, 50, 50), { ...C.mimoza, rate: 170, exp: 58, curve: 'medium', evo: { at: 24, to: 'mimoza_oracle' },
        desc: 'Plays a harp in a city high up a desert tree. Its music keeps the sandstorm spinning round, so nothing gets in.',
        abilities: ['dune_caller', 'encore', 'desert_fury'],
        learn: '1 hymn, 1 love_sonata, 5 crescendo, 9 desert_aria, 12 hymn, 15 geomancy, 18 warding_carol, 21 crescendo',
        habitat: 'desert', rarity: 'uncommon' }),
      mimoza_oracle: S('Mimoza', 'e5_sand_oracle', B(80, 50, 75, 100, 75, 85), { type2: 'beast', ...C.mimoza, rate: 75, exp: 212, curve: 'medium',
        desc: 'Can hear the sand talking and answers it in song. When it stops playing, the whole desert holds its breath.',
        abilities: ['dune_caller', 'encore', 'desert_fury'],
        learn: '24 whisker_blast, 27 hymn, 30 moonlit_waltz, 33 dusk_requiem, 36 crescendo, 40 high_note, 44 aria',
        habitat: 'desert', rarity: 'uncommon' }),

      // Mocha (Frog Catcher > Gourmand): the Qu, who eat everything and learn from it
      mocha_catcher: S('Mocha', 'e5_frog_catcher', B(70, 45, 55, 55, 50, 30), { ...C.mocha, rate: 190, exp: 60, curve: 'medium', evo: { at: 23, to: 'mocha_gourmand' },
        desc: 'Hunts frogs in the marsh all day with a net. It lets the little ones go, then catches them again for practice.',
        abilities: ['blue_learning', 'scrap_eater', 'venom_drinker'],
        learn: '1 bite, 1 goblin_punch, 4 quicksand, 8 bite, 11 roar, 14 blood_suck, 17 goblin_punch, 20 snack_break',
        habitat: 'swamp', rarity: 'common' }),
      mocha_gourmand: S('Mocha', 'e5_gourmand', B(115, 75, 80, 90, 80, 40), { type2: 'redmage', ...C.mocha, rate: 75, exp: 214, curve: 'medium',
        desc: 'Has eaten things no moogle ought to eat and learned a trick from every one. It rates each foe by taste, out of ten.',
        abilities: ['blue_learning', 'scrap_eater', 'venom_drinker'],
        learn: '23 limit_glove, 26 bite, 29 aqua_breath, 32 bad_breath, 35 goblin_punch, 38 white_wind, 42 wildfire_oil, 46 phantasm',
        habitat: 'swamp', rarity: 'common' }),

      // Moorock (Mage Doll > Village Mage): the black mages who walked away from the factory
      moorock_doll: S('Moorock', 'e5_mage_doll', B(45, 30, 40, 70, 55, 60), { ...C.moorock, rate: 190, exp: 58, curve: 'medium', evo: { at: 26, to: 'moorock_villager' },
        desc: 'Was built in a factory to fight, then wandered off to find out what a sunset is. It still isn\'t sure, but it likes them.',
        abilities: ['mana_surge', 'unstoppable'],
        learn: '1 fire, 1 blizzard, 4 sleep_spell, 7 thunder, 10 fire, 13 bio, 16 aspir, 19 blizzard, 22 slowga, 25 fire',
        habitat: 'forest', rarity: 'common' }),
      moorock_villager: S('Moorock', 'e5_village_mage', B(65, 45, 60, 110, 80, 95), { type2: 'freelancer', ...C.moorock, rate: 80, exp: 212, curve: 'medium',
        desc: 'Lives with its friends in a hidden forest village. It farms, keeps the shop and wonders quietly what comes after.',
        abilities: ['e5_trance', 'unstoppable'],
        learn: '26 kupo_holler, 29 fira, 32 fire, 35 astral_fire, 38 blizzaga, 42 scathe, 46 flare',
        habitat: 'forest', rarity: 'common' }),

      // Moodon (Pluto Recruit > Pluto Knight > Pluto Captain): the Knights of Pluto, all eight of them
      moodon_recruit: S('Moodon', 'e5_pluto_recruit', B(60, 60, 70, 25, 40, 35), { ...C.moodon, rate: 190, exp: 60, curve: 'medium', evo: { at: 18, to: 'moodon_knight' },
        desc: 'Joined the knights at the very bottom of the ranks. There are only eight of them, and it is still at the bottom.',
        abilities: ['vitality_plus', 'heavy_armor', 'righteous_ire'],
        learn: '1 shield_bash, 1 cover, 4 slash, 8 rend_armor, 11 shield_bash, 14 challenge, 17 slash',
        habitat: 'ruins', rarity: 'common' }),
      moodon_knight: S('Moodon', 'e5_pluto_knight', B(80, 85, 95, 35, 55, 45), { ...C.moodon, rate: 90, exp: 140, curve: 'medium', evo: { at: 33, to: 'moodon_captain' },
        desc: 'Clanks so loudly it has never sneaked up on anything. It shouts that it is NOT rusty before every single battle.',
        abilities: ['vitality_plus', 'heavy_armor', 'righteous_ire'],
        learn: '18 valiant, 21 shield_bash, 24 iron_wall, 27 juggernaut, 30 shield_bash, 32 power_break',
        habitat: 'ruins', rarity: 'common' }),
      moodon_captain: S('Moodon', 'e5_pluto_captain', B(100, 120, 120, 45, 70, 55), { type2: 'warrior', ...C.moodon, rate: 45, exp: 236, curve: 'medium',
        desc: 'Captain of a small, loud order of knights. Its armor has gone a bit rusty, but its loyalty to the princess never will.',
        abilities: ['e5_trance', 'heavy_armor', 'righteous_ire'],
        learn: '33 darkside, 36 slash, 39 minus_strike, 42 shield_bash, 45 hallowed_bolt',
        habitat: 'ruins', rarity: 'common' }),

      // Serino (Palace Guard > General): the queen's soldiers and their one-eyed general
      serino_guard: S('Serino', 'e5_palace_guard', B(50, 65, 55, 45, 45, 55), { ...C.serino, rate: 150, exp: 62, curve: 'medium', evo: { at: 27, to: 'serino_general' },
        desc: 'Guards the castle with a curved sword and a very stern face. It practises the stern face in the mirror every morning.',
        abilities: ['last_stand', 'clear_head', 'iaijutsu'],
        learn: '1 slash, 1 warcry, 4 aero, 8 maim, 12 slash, 15 power_break, 18 blade_beam, 21 slash, 24 bravery',
        habitat: 'mountain', rarity: 'uncommon' }),
      serino_general: S('Serino', 'e5_general', B(75, 110, 85, 75, 75, 90), { type2: 'whitemage', ...C.serino, rate: 60, exp: 218, curve: 'medium',
        desc: 'A legendary swordsmoogle who has never lost a duel. One eye is covered, and it still saw exactly what you did.',
        abilities: ['last_stand', 'clear_head', 'iaijutsu'],
        learn: '27 holy_mace, 30 slash, 33 cure, 36 cross_slash, 40 slash, 44 climhazzard',
        habitat: 'mountain', rarity: 'uncommon' }),

      // Mogrich (Engine Hand > Airship Engineer > Regent): the airship city
      mogrich_hand: S('Mogrich', 'e5_engine_hand', B(55, 60, 60, 35, 45, 40), { ...C.mogrich, rate: 170, exp: 60, curve: 'medium', evo: { at: 20, to: 'mogrich_engineer' },
        desc: 'Shovels coal in the engine rooms of the great airship city. Its face is always sooty, and it is always grinning.',
        abilities: ['vitality_plus', 'marksman'],
        learn: '1 wrench, 1 oil_change, 4 rivet_gun, 8 big_shot, 11 wrench, 14 eureka, 17 piston_punch, 19 rivet_gun',
        habitat: 'sky', rarity: 'uncommon' }),
      mogrich_engineer: S('Mogrich', 'e5_airship_engineer', B(70, 85, 85, 50, 60, 55), { ...C.mogrich, rate: 85, exp: 140, curve: 'medium', evo: { at: 37, to: 'mogrich_regent' },
        desc: 'Can rebuild a propeller in the dark with one paw. It names every airship it fixes and remembers every name.',
        abilities: ['vitality_plus', 'marksman'],
        learn: '20 drill, 23 wrench, 26 air_anchor, 29 automaton, 32 rivet_gun, 35 scattergun',
        habitat: 'sky', rarity: 'uncommon' }),
      mogrich_regent: S('Mogrich', 'e5_regent', B(90, 115, 105, 65, 80, 75), { type2: 'ranger', ...C.mogrich, rate: 45, exp: 238, curve: 'medium',
        desc: 'Commands a whole airship fleet from the bridge. A witch once turned it into a bug, and it would rather not discuss it.',
        abilities: ['vitality_plus', 'marksman'],
        learn: '37 musket, 40 snap_shot, 43 wrench, 47 broadside',
        habitat: 'sky', rarity: 'uncommon' }),

      // Mozme (Card Shark > Card Noble): the card game of the city of night
      mozme_shark: S('Mozme', 'e5_card_shark', B(45, 60, 45, 55, 45, 70), { ...C.mozme, rate: 150, exp: 62, curve: 'medium', evo: { at: 25, to: 'mozme_noble' },
        desc: 'Plays cards in the city of night, where the lamps never go out. It plays for coins, stars and other moogles\' hats.',
        abilities: ['coin_up', 'kupo_luck'],
        learn: '1 dice, 1 trip, 4 pilfer, 8 card_trick, 11 dice, 14 prowl, 17 plunder, 20 dice, 23 sleight_of_hand',
        habitat: 'night', rarity: 'uncommon' }),
      mozme_noble: S('Mozme', 'e5_card_noble', B(65, 95, 65, 80, 65, 110), { type2: 'timemage', ...C.mozme, rate: 70, exp: 214, curve: 'medium',
        desc: 'Owns a mansion, a stadium box and a card for every monster that ever lived. It still wants yours. Especially yours.',
        abilities: ['spoils_of_war', 'kupo_luck'],
        learn: '25 quick_spell, 28 dice, 31 coup_de_grace, 34 forecast, 37 dice, 40 premonition, 44 jackpot',
        habitat: 'night', rarity: 'uncommon' }),

      // Moguta (Treasure Digger > Chocographer): Chocobo Hot and Cold
      moguta_digger: S('Moguta', 'e5_treasure_digger', B(55, 60, 55, 35, 45, 55), { ...C.moguta, rate: 190, exp: 56, curve: 'fast', evo: { at: 22, to: 'moguta_chocographer' },
        desc: 'Sniffs out buried treasure on the beach and digs until something goes clink. Mostly the clink is another shovel.',
        abilities: ['kupo_luck', 'coin_up'],
        learn: '1 acorn, 1 roar, 4 choco_kick, 8 quicksand, 11 acorn, 14 seed_cannon, 17 paw_swat, 20 choco_kick',
        habitat: 'beach', rarity: 'common' }),
      moguta_chocographer: S('Moguta', 'e5_chocographer', B(80, 95, 80, 50, 70, 90), { type2: 'ranger', ...C.moguta, rate: 80, exp: 208, curve: 'fast',
        desc: 'Reads old treasure maps drawn by chocobos. It shouts "Hot! Cold!" while it digs, mostly to itself.',
        abilities: ['kupo_luck', 'coin_up'],
        learn: '22 gaia_rage, 25 arrow, 28 aim, 31 choco_kick, 34 sharpshot, 37 chocobo_rush, 40 arrow, 44 powder_keg',
        habitat: 'beach', rarity: 'common' }),

      // Moonte (Quizmaster): the forest quiz
      moonte_quizmaster: S('Moonte', 'e5_quizmaster', B(75, 45, 70, 100, 85, 95), { type2: 'timemage', ...C.moonte, rate: 80, exp: 178, curve: 'medium',
        desc: 'Pops out of holes in the forest to ask true-or-false questions. Get one right and it throws a party; wrong, it sulks.',
        abilities: ['fast_learner', 'coin_up'],
        learn: '1 sonic_chord, 1 bad_joke, 5 tick_tock, 9 slow, 13 sonic_chord, 17 heckle_riff, 21 prime_strike, 25 nocturne, 29 tick_tock, 33 high_note, 37 old_spell, 41 sonic_chord, 45 symphony, 48 comet',
        habitat: 'forest', rarity: 'uncommon' }),

      // Mogki (Letter Carrier > Mognet Courier): the Mognet, letters between moogles everywhere
      mogki_carrier: S('Mogki', 'e5_letter_carrier', B(50, 55, 45, 40, 45, 70), { ...C.mogki, rate: 220, exp: 54, curve: 'fast', evo: { at: 18, to: 'mogki_courier' },
        desc: 'Carries letters between moogles in every corner of the world. It reads none of them, apart from the juicy ones.',
        abilities: ['pom_wings', 'auto_haste'],
        learn: '1 errand_run, 1 pout, 4 wing_flutter, 7 dash, 10 errand_run, 13 talon, 16 mognet_relay',
        habitat: 'grass', rarity: 'common' }),
      mogki_courier: S('Mogki', 'e5_mognet_courier', B(70, 90, 65, 55, 65, 115), { type2: 'dragoon', ...C.mogki, rate: 90, exp: 205, curve: 'fast',
        desc: 'Delivers Mognet mail at top speed and never loses a letter. Now and then it delivers one to the wrong moogle, at top speed.',
        abilities: ['pom_wings', 'auto_haste'],
        learn: '18 dive_bomb, 21 errand_run, 24 yell, 27 wyrmwind, 30 mog_rush, 33 talon, 37 mognet_relay, 40 errand_run, 44 high_jump',
        habitat: 'grass', rarity: 'common' }),

      // Suzuna (Diary Keeper > Save Keeper): the moogles who keep travellers' diaries
      suzuna_keeper: S('Suzuna', 'e5_diary_keeper', B(65, 35, 55, 55, 60, 40), { ...C.suzuna, rate: 180, exp: 58, curve: 'medium', evo: { at: 24, to: 'suzuna_save' },
        desc: 'Keeps a diary of every traveller who passes. Ask it to write your name down and it will keep your place until you return.',
        abilities: ['medicine', 'auto_esuna'],
        learn: '1 banish, 1 potion, 5 holy_glare, 9 regen_spell, 13 banish, 16 esuna, 19 pearl_volley, 22 time_capsule',
        habitat: 'cave', rarity: 'common' }),
      suzuna_save: S('Suzuna', 'e5_save_keeper', B(100, 45, 85, 85, 100, 60), { type2: 'timemage', ...C.suzuna, rate: 75, exp: 212, curve: 'medium',
        desc: 'Glows softly in deep caves so tired travellers can rest. It remembers exactly where you left off, even when you don\'t.',
        abilities: ['medicine', 'auto_esuna'],
        learn: '24 rewind_time, 27 tick_tock, 30 banishga, 33 temperance, 36 holy_glare, 40 moonbeam, 44 judgment',
        habitat: 'cave', rarity: 'common' }),

      // Momatose (Napper > Dreamwalker): the moogle who is always asleep
      momatose_napper: S('Momatose', 'e5_napper', B(75, 55, 50, 50, 50, 25), { ...C.moma, rate: 160, exp: 62, curve: 'slow', evo: { at: 28, to: 'momatose_dreamwalker' },
        desc: 'Asleep, mostly. When it does wake up, it is usually because it is time for its next nap.',
        abilities: ['auto_regen', 'zen_mind'],
        learn: '1 pom_bop, 1 pom_dust, 5 haunt, 9 snack_break, 13 pom_bop, 17 kupo_toss, 21 accumulate, 25 haunt',
        habitat: 'cave', rarity: 'uncommon' }),
      momatose_dreamwalker: S('Momatose', 'e5_dreamwalker', B(120, 90, 75, 85, 80, 30), { type2: 'summoner', ...C.moma, rate: 70, exp: 214, curve: 'slow',
        desc: 'Fights in its sleep and wins there too. Nobody has ever seen its eyes open, and it would like to keep it that way.',
        abilities: ['auto_regen', 'zen_mind'],
        learn: '28 pollen_haze, 31 pom_bop, 34 ectoplasm, 37 mop_up, 40 haunt, 44 full_course, 48 ghost_train',
        habitat: 'cave', rarity: 'uncommon' }),
    },

    // ---------------------------------------------------------------- the Kupodex order (line by line)
    dex: [
      'seedmog_cadet', 'seedmog_seed', 'seedmog_commander',
      'scarmog_disciplinarian', 'scarmog_rival', 'scarmog_knight',
      'drawpom_adept', 'drawpom_junctioner', 'drawpom_guardian',
      'triadmog_player', 'triadmog_queen',
      'crampmog_private', 'crampmog_knight', 'crampmog_president',
      'katalmog_fighter', 'katalmog_dancer',
      'hushmog_guard', 'hushmog_janitor',
      'chasemog_drone', 'chasemog_tank',
      'oddimog_assistant', 'oddimog_researcher', 'oddimog_scientist',
      'sorcepom_witchling', 'sorcepom_sorceress', 'sorcepom_time',
      'ragnamog_cadet', 'ragnamog_pilot', 'ragnamog_ragnarok',
      'chicomog_kid', 'chicomog_chocoboy', 'chicomog_sage',
      'moombapom_carver', 'moombapom_moomba',
      'pocketmog_pet',
      'bokomog_rider',
      'booyamog_fan', 'booyamog_duelist',
      'eidomog_pet', 'eidomog_eidolon', 'eidomog_holy',
      'monty_stagehand', 'monty_actor', 'monty_master',
      'mopli_squire', 'mopli_lancer', 'mopli_dragoon',
      'mimoza_maiden', 'mimoza_oracle',
      'mocha_catcher', 'mocha_gourmand',
      'moorock_doll', 'moorock_villager',
      'moodon_recruit', 'moodon_knight', 'moodon_captain',
      'serino_guard', 'serino_general',
      'mogrich_hand', 'mogrich_engineer', 'mogrich_regent',
      'mozme_shark', 'mozme_noble',
      'moguta_digger', 'moguta_chocographer',
      'moonte_quizmaster',
      'mogki_carrier', 'mogki_courier',
      'suzuna_keeper', 'suzuna_save',
      'momatose_napper', 'momatose_dreamwalker',
    ],
  });
})();

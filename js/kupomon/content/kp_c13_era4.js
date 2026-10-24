// Kupomon expansion, pack 'era4' (docs/KUPOMON_CONTENT.md): the moogles of FF VII and its Compilation, as Cait Sith's
// robot moogles would play them. Cait Sith's big plush moogle, the five kinds of Materia, Shinra and its departments,
// Deepground (the pseudo-legendary), AVALANCHE, Midgar's slums and Wall Market, the Gold Saucer's squares, Cosmo Canyon,
// Nibelheim, Rocket Town, Wutai, Junon, the Highwind, Banora's apples and the winged SOLDIERs, Advent Children's
// delivery runs, and Remake / Rebirth's Moogle Emporium, Mog House, combat assignments, Queen's Blood, Fort Condor and
// Gears and Gambits. 31 lines, 71 moogles; homage in our own words.
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const S = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });
  KP.content('era4', {
    // ------------------------------------------------------------------ jobs (one per stage; each stage grander)
    jobs: {
      // Plushmog: Cait Sith's big moogle
      e4_plushie: J('Plushie', 'freelancer', { hat: 'ribbon', body: 'patchfur', weapon: 'none', g1: '#f4f0e8', g2: '#d04040' }),
      e4_fortune_teller: J('Fortune Teller', 'freelancer', { hat: 'catmask', body: 'magiccape', weapon: 'megaphone', g1: '#1a1a22', g2: '#c02838' }),
      e4_slot_royale: J('Slot Royale', 'freelancer', { hat: 'crown', body: 'royal', weapon: 'megaphone', cape: '#c02838', g1: '#d8b040', g2: '#1a1a22' }),
      // Verdikin: Magic Materia
      e4_materia_bud: J('Materia Bud', 'blackmage', { hat: 'elemcirclet', body: 'robe', weapon: 'orb', g1: '#2a8a4a', g2: '#80ff90' }),
      e4_materia_adept: J('Materia Adept', 'blackmage', { hat: 'runecirclet', body: 'mantle', weapon: 'orbstaff', g1: '#1a6a3a', g2: '#60ffa0' }),
      e4_materia_master: J('Materia Master', 'blackmage', { hat: 'sage', body: 'magiccape', weapon: 'elemstaff', extra: ['wisps'], g1: '#145a34', g2: '#c0ffc8' }),
      // Citrikin: Command Materia
      e4_mugger: J('Mugger', 'thief', { hat: 'bandana', body: 'vest', weapon: 'dagger', g1: '#e8c020', g2: '#3a3a40' }),
      e4_w_commander: J('W-Commander', 'thief', { hat: 'shades', body: 'bandolier', weapon: 'shuriken', cape: '#e8c020', g1: '#e0b010', g2: '#1a1a22' }),
      // Linkpom: Support Materia
      e4_link_guard: J('Link Guard', 'knight', { hat: 'kettle', body: 'tabard', weapon: 'shortsword', shield: 'round', g1: '#3a6ad8', g2: '#a0d8ff' }),
      e4_counter_knight: J('Counter Knight', 'knight', { hat: 'sallet', body: 'runeplate', weapon: 'runesword', shield: 'kite', cape: '#2a4ab0', g1: '#2a4ab0', g2: '#80c8ff' }),
      // Rubimog: Summon Materia
      e4_summon_seed: J('Summon Seed', 'summoner', { hat: 'hood', body: 'robe', weapon: 'orb', g1: '#b01828', g2: '#ff7060' }),
      e4_choco_caller: J('Choco Caller', 'summoner', { hat: 'chococrest', body: 'mantle', weapon: 'flute', g1: '#c02838', g2: '#ffd040' }),
      e4_round_herald: J('Round Herald', 'summoner', { hat: 'horncrown', body: 'tabard', weapon: 'holysword', shield: 'kite', cape: '#a01020', extra: ['halo'], g1: '#d8b040', g2: '#c02030' }),
      // Amethymog: Independent Materia
      e4_plus_adept: J('Plus Adept', 'timemage', { hat: 'plume', body: 'starcoat', weapon: 'scepter', g1: '#7a3ac0', g2: '#e0b0ff' }),
      // Execmog: the Shinra Electric Power Company
      e4_intern: J('Intern', 'bard', { hat: 'earpiece', body: 'suit', weapon: 'clipboard', g1: '#3a4a7a', g2: '#f0f0f0' }),
      e4_executive: J('Executive', 'bard', { hat: 'shades', body: 'waistcoat', weapon: 'briefcase', g1: '#1a1a22', g2: '#c8a040' }),
      e4_president: J('President', 'bard', { hat: 'tophat', body: 'tuxedo', weapon: 'microphone', cape: '#f4f4f0', g1: '#f4f4f0', g2: '#d8b040' }),
      // Clodkin: Weapons Development
      e4_arms_tester: J('Arms Tester', 'machinist', { hat: 'safetyhelm', body: 'hivis', weapon: 'springgun', g1: '#c02030', g2: '#3a3a40' }),
      e4_clod_pilot: J('Clod Pilot', 'machinist', { hat: 'gearhelm', body: 'tekarmor', weapon: 'gatling', shield: 'tower', g1: '#7a1020', g2: '#b8bcc8' }),
      // Riotmog: Public Safety
      e4_shinra_mp: J('Shinra MP', 'knight', { hat: 'armyhelm', body: 'security', weapon: 'baton', shield: 'round', g1: '#3a4a8a', g2: '#20202a' }),
      e4_hound_captain: J('Hound Captain', 'knight', { hat: 'bascinet', body: 'trooper', weapon: 'whip', shield: 'kite', cape: '#2a5a3a', g1: '#2a5a3a', g2: '#d8b040' }),
      // Avamog: AVALANCHE
      e4_lookout: J('Lookout', 'thief', { hat: 'bandana', body: 'hoodie', weapon: 'kunai', g1: '#3a5a3a', g2: '#c0a060' }),
      e4_saboteur: J('Saboteur', 'thief', { hat: 'goggles', body: 'bandolier', weapon: 'flask', liquid: '#ffa020', g1: '#2a2a30', g2: '#ff8030' }),
      e4_reactor_raider: J('Reactor Raider', 'thief', { hat: 'hachigane', body: 'harness', weapon: 'cannon', cape: '#3a6a3a', g1: '#3a6a3a', g2: '#e8c040' }),
      // Slumkin: Midgar's slums
      e4_scavenger: J('Scavenger', 'machinist', { hat: 'bucket', body: 'rags', weapon: 'wrench', g1: '#7a6a50', g2: '#a0a0a8' }),
      e4_junk_baron: J('Junk Baron', 'machinist', { hat: 'gearcrown', body: 'toolbelt', weapon: 'broadsword', cape: '#6a5a40', g1: '#6a5a40', g2: '#c8a040' }),
      // Glamkupo: Wall Market
      e4_backup_dancer: J('Backup Dancer', 'bard', { hat: 'tiara', body: 'streamers', weapon: 'fans', g1: '#ffd040', g2: '#ff4090' }),
      e4_honey_star: J('Honey Star', 'bard', { hat: 'wig', body: 'gown', weapon: 'bouquet', extra: ['beewings'], g1: '#ffc020', g2: '#1a1a1a' }),
      // Derbymog: Chocobo Square
      e4_jockey: J('Jockey', 'beast', { hat: 'ballcap', body: 'jersey', weapon: 'whip', mount: { kind: 'chocobo' }, g1: '#e8c020', g2: '#2a4ab0' }),
      e4_s_class_racer: J('S-Class Racer', 'beast', { mount: { kind: 'chocobo' }, hat: 'chocohelm', body: 'featherarmor', weapon: 'flag', cape: '#e8c020', extra: ['featherwings'], g1: '#1a1a1a', g2: '#f0f0f0' }),
      // Arenakupo: Battle Square
      e4_arena_rookie: J('Arena Rookie', 'warrior', { hat: 'plaster', body: 'tanktop', weapon: 'shortsword', g1: '#a02020', g2: '#e8c040' }),
      e4_square_champion: J('Square Champion', 'warrior', { hat: 'laurel', body: 'harness', weapon: 'greataxe', cape: '#d8b040', g1: '#d8b040', g2: '#8a2a20' }),
      // Bellboo: the Ghost Hotel
      e4_bellhop: J('Bellhop', 'summoner', { hat: 'pagecap', body: 'sheet', weapon: 'bell', g1: '#c02030', g2: '#f4f6ff' }),
      e4_night_manager: J('Night Manager', 'summoner', { hat: 'nightcap', body: 'shroud', weapon: 'candle', extra: ['wisps'], g1: '#3a2a5a', g2: '#c0a0ff', shadowFace: true, eyes: '#ffb0ff' }),
      // Cosmopom: Cosmo Canyon
      e4_candle_keeper: J('Candle Keeper', 'whitemage', { hat: 'feather', body: 'poncho', weapon: 'candle', g1: '#c86030', g2: '#ffd070' }),
      e4_star_scholar: J('Star Scholar', 'whitemage', { hat: 'spectacles', body: 'robe', weapon: 'starglobe', g1: '#a04a20', g2: '#80d0ff' }),
      e4_planet_elder: J('Planet Elder', 'whitemage', { hat: 'none', body: 'mantle', weapon: 'orb', cape: '#c05020', extra: ['halo'], g1: '#c05020', g2: '#a0f0ff' }),
      // Nibelpom: Nibelheim and Mt. Nibel
      e4_trail_guide: J('Trail Guide', 'ranger', { hat: 'cowboy', body: 'backpack', weapon: 'grapple', g1: '#8a5a30', g2: '#d8c8a0' }),
      e4_peak_guide: J('Peak Guide', 'ranger', { hat: 'headlamp', body: 'harness', weapon: 'gloves', g1: '#3a3a40', g2: '#e05030' }),
      // Rocketpom: Rocket Town
      e4_launch_tech: J('Launch Tech', 'machinist', { hat: 'beanie', body: 'overalls', weapon: 'screwdriver', g1: '#d84030', g2: '#e8e8f0' }),
      e4_test_pilot: J('Test Pilot', 'machinist', { hat: 'goggles', body: 'jacket', weapon: 'flare', g1: '#3a5a8a', g2: '#ffd040' }),
      e4_rocketeer: J('Rocketeer', 'machinist', { hat: 'captain', body: 'longcoat', weapon: 'spear', cape: '#c03030', extra: ['jetpack'], g1: '#2a3a5a', g2: '#e8e0c8' }),
      // Pagodamog: Wutai's pagoda
      e4_pagoda_pupil: J('Pagoda Pupil', 'monk', { hat: 'headwrap', body: 'gi', weapon: 'quarterstaff', g1: '#3a7a5a', g2: '#e8d8a0' }),
      e4_floor_guardian: J('Floor Guardian', 'monk', { hat: 'spiritmask', body: 'hakama', weapon: 'ringstaff', g1: '#2a5a4a', g2: '#d8b040' }),
      e4_pagoda_lord: J('Pagoda Lord', 'monk', { hat: 'kabuto', body: 'mantle', weapon: 'cestus', cape: '#1a4a3a', extra: ['wisps'], g1: '#1a4a3a', g2: '#e8c040' }),
      // Junopom: Junon
      e4_parade_cadet: J('Parade Cadet', 'ranger', { hat: 'sailor', body: 'sailorcollar', weapon: 'rifle', g1: '#2a4a8a', g2: '#f4f4f0' }),
      e4_drum_major: J('Drum Major', 'ranger', { hat: 'plumed', body: 'doublet', weapon: 'baton', cape: '#2a4a8a', g1: '#2a4a8a', g2: '#e8c040' }),
      // Airkupo: the Highwind's crew
      e4_deckhand: J('Deckhand', 'dragoon', { hat: 'kerchief', body: 'stripes', weapon: 'mop', g1: '#3a5a8a', g2: '#f0f0f0' }),
      e4_helmsman: J('Helmsman', 'dragoon', { hat: 'skyhelm', body: 'longcoat', weapon: 'harpoon', g1: '#5a3a2a', g2: '#d8c070' }),
      // Banopom: Banora's apples, LOVELESS and a crimson wing
      e4_orchard_hand: J('Orchard Hand', 'beast', { hat: 'leafhat', body: 'basket', weapon: 'sprig', g1: '#5a8a3a', g2: '#e04040' }),
      e4_loveless_poet: J('Loveless Poet', 'bard', { hat: 'quillcap', body: 'longcoat', weapon: 'book', cape: '#a01820', g1: '#a01820', g2: '#e8d8a0' }),
      e4_crimson_wing: J('Crimson Wing', 'warrior', { hat: 'none', body: 'soldier', weapon: 'flamesword', cape: '#a01820', extra: ['onewing'], g1: '#8a1020', g2: '#2a2a30', glow: '#ff4030' }),
      // Wingmog: a white-winged SOLDIER
      e4_white_wing: J('White Wing', 'warrior', { hat: 'saintband', body: 'soldier', weapon: 'buster', extra: ['featherwings'], g1: '#3a3a5a', g2: '#f4f4f8' }),
      // Deepkupo: Deepground (the pseudo-legendary)
      e4_deep_cadet: J('Deep Cadet', 'knight', { hat: 'halfmask', body: 'catsuit', weapon: 'shortsword', g1: '#2a2a36', g2: '#c02030' }),
      e4_restrictor: J('Restrictor', 'knight', { hat: 'darkhelm', body: 'darkplate', weapon: 'gunblade', g1: '#1a1a24', g2: '#a01828', shadowFace: true, eyes: '#ff2020' }),
      e4_tsviet: J('Tsviet', 'knight', { hat: 'ravagerhelm', body: 'darkplate', weapon: 'gunblade', cape: '#1a1a22', extra: ['dragonwings'], g1: '#e8e8f0', g2: '#1a1a22', glow: '#ff2040', shadowFace: true, eyes: '#ff2020' }),
      // Courikupo: a delivery service after the fall of Midgar
      e4_courier: J('Courier', 'freelancer', { hat: 'newsboy', body: 'backpack', weapon: 'newspaper', g1: '#3a3a40', g2: '#c8a060' }),
      e4_road_rider: J('Road Rider', 'freelancer', { hat: 'shades', body: 'leather', weapon: 'greatsword', g1: '#1a1a22', g2: '#7a7a88' }),
      // Kupokid: the Moogle Emporium and its moogle kids
      e4_mog_kid: J('Mog Kid', 'freelancer', { hat: 'propeller', body: 'overalls', weapon: 'balls', g1: '#ff8030', g2: '#40a0ff' }),
      e4_emporium_clerk: J('Emporium Clerk', 'freelancer', { hat: 'beret', body: 'apron', weapon: 'coinpurse', g1: '#5a3a8a', g2: '#e8c040' }),
      e4_mog_merchant: J('Mog Merchant', 'freelancer', { hat: 'fedora', body: 'backpack', weapon: 'abacus', cape: '#6a3a8a', g1: '#6a3a8a', g2: '#e8c040' }),
      // Deckpom: Queen's Blood
      e4_card_novice: J('Card Novice', 'redmage', { hat: 'domino', body: 'waistcoat', weapon: 'cards', g1: '#1a5a3a', g2: '#e8e0c8' }),
      e4_card_duelist: J('Card Duelist', 'redmage', { hat: 'musketeer', body: 'duelcoat', weapon: 'cards', g1: '#6a1a2a', g2: '#e8c040' }),
      e4_card_queen: J('Card Queen', 'redmage', { hat: 'tiara', body: 'magiccape', weapon: 'scepter', cape: '#7a1a3a', extra: ['fairy'], g1: '#7a1a3a', g2: '#f0d060' }),
      // Condorpom: Fort Condor
      e4_fort_lookout: J('Fort Lookout', 'ranger', { hat: 'explorer', body: 'quiver', weapon: 'crossbow', g1: '#8a6a3a', g2: '#3a6a3a' }),
      e4_condor_marshal: J('Condor Marshal', 'ranger', { hat: 'winghead', body: 'featherarmor', weapon: 'longbow', cape: '#7a4a2a', extra: ['falcon'], g1: '#6a3a1a', g2: '#e8d8b0' }),
      // Gambitkin: Gears and Gambits
      e4_gambiteer: J('Gambiteer', 'machinist', { hat: 'monocle', body: 'clockwork', weapon: 'windkey', g1: '#6a4a2a', g2: '#e0b040' }),
      // Nibblemog: the Mog House
      e4_nut_nibbler: J('Nut Nibbler', 'freelancer', { hat: 'none', body: 'basket', weapon: 'none', g1: '#c8a060', g2: '#8a5a30' }),
      e4_sky_mog: J('Sky Mog', 'freelancer', { hat: 'flightcap', body: 'scarf', weapon: 'none', g1: '#e04040', g2: '#f0f0f0' }),
      // Datapom: a materia researcher's combat assignments
      e4_field_researcher: J('Field Researcher', 'timemage', { hat: 'loupe', body: 'coat', weapon: 'clipboard', g1: '#f0f0f4', g2: '#3a6ad0' }),
      e4_battle_analyst: J('Battle Analyst', 'timemage', { hat: 'earpiece', body: 'gadgetpack', weapon: 'raygun', g1: '#e8e8f0', g2: '#40c0ff' }),
    },

    // ------------------------------------------------------------------ signature moves (4)
    moves: {
      e4_slot_reel: { name: 'Slot Reel', type: 'bard', power: 25, acc: 100, cd: 2, hits: [2, 5], status: [['confuse', 'mini', 'slow', 'blind'], 15], flags: ['sound'], desc: 'Spins the reels: 2-5 hits, and maybe a random ailment as the prize.' },
      e4_knights_round: { name: "Knights' Round", type: 'summoner', power: 14, acc: 95, cd: 3, hits: 10, charge: { text: 'is calling the knights to its side!' }, desc: 'Calls its knights for a turn, then ten blades fall one after another.' },
      e4_twin_gunblades: { name: 'Twin Gunblades', type: 'knight', power: 45, acc: 95, cd: 1, hits: 2, flags: ['contact', 'slice'], desc: 'Two gunblades, two cuts, two bangs: hits twice.' },
      e4_dumbapple: { name: 'Dumbapple', type: 'beast', power: 0, acc: true, cd: 3, heal: 0.5, self: { res: 1 }, desc: 'Munches an odd purple apple: heals 50% and Resistance up.' },
    },

    // ------------------------------------------------------------------ signature abilities (2)
    abilities: {
      e4_all_plus: { name: 'Plus Materia', desc: 'Attack, Defense, Magic, Resistance and Speed are all 1.1x.', statMul: { atk: 1.1, def: 1.1, mag: 1.1, res: 1.1, spd: 1.1 } },
      e4_limiter_off: { name: 'Limiter Off', desc: 'At 1/3 HP its limiter breaks: own-type moves 1.5x, Speed 1.5x.', boost: { types: ['own'], mul: 1.5, below: 0.34 }, pinchSpd: 1.5 },
    },

    // ------------------------------------------------------------------ species
    species: {
      // ---- Plushmog: Cait Sith's big moogle (Freelancer, then Bard)
      plushmog_plushie: {
        moogle: 'Plushmog', job: 'e4_plushie', type: 'freelancer', base: S(70, 55, 60, 35, 50, 30),
        rate: 190, exp: 58, curve: 'medium', fur: '#f6f2ea', pom: '#e83a4a', nose: '#d04050', wing: '#b04060',
        evo: { at: 16, to: 'plushmog_fortune_teller' },
        desc: 'A stuffed moogle the size of a sofa. It runs on two batteries and a lot of hope, and it never stops grinning.',
        abilities: ['kupo_luck', 'stand_firm', 'blink_image'],
        learn: '1 pom_bop, 1 pout, 4 pom_dust, 8 kupo_toss, 12 pom_flurry, 16 kupo_charge, 21 mog_guard, 26 pom_bop, 30 accumulate, 34 sonic_chord, 39 kupo_rush',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },
      plushmog_fortune_teller: {
        moogle: 'Plushmog', job: 'e4_fortune_teller', type: 'freelancer', type2: 'bard', base: S(95, 75, 80, 50, 70, 40),
        rate: 90, exp: 140, curve: 'medium', fur: '#f6f2ea', pom: '#e83a4a', nose: '#d04050', wing: '#b04060',
        evo: { at: 34, to: 'plushmog_slot_royale' },
        desc: 'A black cat rides on its head and reads fortunes through a megaphone. The fortunes are vague; the hugs are guaranteed.',
        abilities: ['kupo_luck', 'stand_firm', 'blink_image'],
        learn: '16 sonic_chord, 19 heckle_riff, 22 mog_guard, 25 pom_bop, 28 bad_joke, 31 high_note, 35 accumulate, 40 crescendo, 45 mic_drop',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },
      plushmog_slot_royale: {
        moogle: 'Plushmog', job: 'e4_slot_royale', type: 'freelancer', type2: 'bard', base: S(120, 95, 100, 60, 90, 50),
        rate: 45, exp: 236, curve: 'medium', fur: '#f6f2ea', pom: '#e83a4a', nose: '#d04050', wing: '#b04060',
        desc: 'It spins slot reels in its tummy while a crowned cat calls the odds. Someone in a Midgar office is steering them both.',
        abilities: ['kupo_luck', 'stand_firm', 'blink_image'],
        learn: '34 e4_slot_reel, 37 crescendo, 40 accumulate, 43 royal_decree, 46 e4_slot_reel',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },

      // ---- Verdikin: Magic Materia (Black Mage, then Red Mage)
      verdikin_materia_bud: {
        moogle: 'Verdikin', job: 'e4_materia_bud', type: 'blackmage', base: S(45, 30, 40, 70, 50, 60),
        rate: 180, exp: 60, curve: 'medium', fur: '#eaf6ea', pom: '#40ff80', wing: '#3aa060',
        evo: { at: 18, to: 'verdikin_materia_adept' },
        desc: "A drop of mako that hardened into a green pearl and grew a pom-pom. It hums little spells when nobody's listening.",
        abilities: ['spellcraft', 'mana_surge', 'swiftcast'],
        learn: '1 fire, 1 blizzard, 4 thunder, 8 sleep_spell, 11 quake_spell, 14 fire, 18 fira, 22 blizzard, 26 astral_fire, 30 thundara, 35 fire, 40 firaga',
        habitat: 'cave', rarity: 'uncommon', class: 'normal',
      },
      verdikin_materia_adept: {
        moogle: 'Verdikin', job: 'e4_materia_adept', type: 'blackmage', type2: 'redmage', base: S(60, 40, 50, 100, 70, 85),
        rate: 90, exp: 145, curve: 'medium', fur: '#eaf6ea', pom: '#40ff80', wing: '#3aa060',
        evo: { at: 34, to: 'verdikin_materia_master' },
        desc: 'Two orbs linked in one slot cast twice as fast. It polishes them every night and names them after its spells.',
        abilities: ['spellcraft', 'mana_surge', 'swiftcast'],
        learn: '18 dualcast, 21 jolt, 24 ley_lines, 27 aspir, 30 triplecast, 33 jolt, 37 astral_fire, 41 verflare, 45 fire',
        habitat: 'cave', rarity: 'uncommon', class: 'normal',
      },
      verdikin_materia_master: {
        moogle: 'Verdikin', job: 'e4_materia_master', type: 'blackmage', type2: 'redmage', base: S(75, 50, 65, 130, 90, 110),
        rate: 45, exp: 240, curve: 'medium', fur: '#eaf6ea', pom: '#40ff80', wing: '#3aa060',
        desc: 'Every orb it carries is mastered, and each mastered orb buds a brand new one. It has run out of pockets.',
        abilities: ['spellcraft', 'mana_surge', 'swiftcast'],
        learn: '34 flare_star, 37 element_orb, 40 fire, 43 astral_fire, 46 flare',
        habitat: 'cave', rarity: 'uncommon', class: 'normal',
      },

      // ---- Citrikin: Command Materia (Thief, then Ranger)
      citrikin_mugger: {
        moogle: 'Citrikin', job: 'e4_mugger', type: 'thief', base: S(50, 70, 40, 35, 40, 85),
        rate: 170, exp: 60, curve: 'medium', fur: '#f6f0d8', pom: '#ffd020',
        evo: { at: 22, to: 'citrikin_w_commander' },
        desc: 'A yellow orb on its belt lets it swipe and strike in one move. It apologizes afterwards, mostly sincerely.',
        abilities: ['sneak_attack', 'coin_up', 'libra'],
        learn: '1 steal, 1 trip, 4 quickhit, 8 smoke, 12 coup_de_grace, 16 steal, 20 sleight_of_hand, 24 backstab, 28 mug, 33 throw, 38 steal',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },
      citrikin_w_commander: {
        moogle: 'Citrikin', job: 'e4_w_commander', type: 'thief', type2: 'ranger', base: S(75, 110, 65, 45, 60, 130),
        rate: 60, exp: 205, curve: 'medium', fur: '#f6f0d8', pom: '#ffd020',
        desc: 'Uses every command twice a turn: two steals, two throws, two shrugs. Shops near its burrow keep closing down.',
        abilities: ['sneak_attack', 'coin_up', 'libra'],
        learn: '22 snap_shot, 25 shuriken, 28 eagle_eye, 31 pilfer, 34 sidewinder, 37 throw, 40 snap_shot, 44 all_creation, 47 steal',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal',
      },

      // ---- Linkpom: Support Materia (Knight, then Red Mage)
      linkpom_link_guard: {
        moogle: 'Linkpom', job: 'e4_link_guard', type: 'knight', base: S(65, 60, 75, 40, 60, 30),
        rate: 160, exp: 62, curve: 'slow', fur: '#eef2fa', pom: '#4aa0ff',
        evo: { at: 26, to: 'linkpom_counter_knight' },
        desc: "A blue orb is wired into its sword hilt. Hit it and the sword answers by itself. It's very polite about it.",
        abilities: ['counter', 'auto_wall'],
        learn: '1 shield_bash, 1 cover, 4 rend_armor, 7 retort, 10 shield_bash, 13 sheltron, 16 aegis_slam, 19 keen_edge, 22 iron_wall, 26 shield_bash, 30 entrench, 35 bounce, 40 spirits_within',
        habitat: 'volcano', rarity: 'uncommon', class: 'normal',
      },
      linkpom_counter_knight: {
        moogle: 'Linkpom', job: 'e4_counter_knight', type: 'knight', type2: 'redmage', base: S(95, 90, 115, 65, 95, 40),
        rate: 60, exp: 208, curve: 'slow', fur: '#eef2fa', pom: '#4aa0ff',
        desc: 'Its armor is studded with paired slots: counter, cover, final strike. Picking a fight with it is a long conversation.',
        abilities: ['counter', 'auto_wall'],
        learn: '26 contre_sixte, 29 riposte, 32 judgment_blade, 35 magick_barrier, 38 keen_edge, 41 zwerchhau, 44 entrench, 47 riposte',
        habitat: 'volcano', rarity: 'uncommon', class: 'normal',
      },

      // ---- Rubimog: Summon Materia (Summoner; Knights of the Round at the end)
      rubimog_summon_seed: {
        moogle: 'Rubimog', job: 'e4_summon_seed', type: 'summoner', base: S(60, 35, 50, 65, 55, 35),
        rate: 150, exp: 62, curve: 'slow', fur: '#f8ecec', pom: '#ff3040', wing: '#c03040',
        evo: { at: 20, to: 'rubimog_choco_caller' },
        desc: 'A red shard with a moogle inside, still learning which spirit answers its calls. Mostly it gets their voicemail.',
        abilities: ['summon_bond', 'dreadwyrm_trance'],
        learn: '1 leaf_gust, 1 ruby_light, 4 searing_light, 8 drizzle, 12 diamond_dust, 16 hellfire, 20 leaf_gust, 24 earth_wall, 28 judgment_bolt, 32 drizzle, 37 tidal_wave, 42 choco_kick',
        habitat: 'ruins', rarity: 'rare', class: 'normal',
      },
      rubimog_choco_caller: {
        moogle: 'Rubimog', job: 'e4_choco_caller', type: 'summoner', base: S(80, 45, 65, 95, 80, 45),
        rate: 75, exp: 148, curve: 'slow', fur: '#f8ecec', pom: '#ff3040', wing: '#c03040',
        evo: { at: 38, to: 'rubimog_round_herald' },
        desc: 'One whistle and a very fat chocobo drops out of the sky, then a moogle dances on top of it. Nobody has asked why.',
        abilities: ['summon_bond', 'dreadwyrm_trance'],
        learn: '20 choco_kick, 23 delta_attack, 26 chocobo_rush, 29 leaf_gust, 32 mist_dragon, 35 choco_meteor, 38 drizzle, 42 earthen_fury, 46 leaf_gust',
        habitat: 'ruins', rarity: 'rare', class: 'normal',
      },
      rubimog_round_herald: {
        moogle: 'Rubimog', job: 'e4_round_herald', type: 'summoner', type2: 'knight', base: S(100, 60, 85, 125, 100, 60),
        rate: 40, exp: 250, curve: 'slow', fur: '#f8ecec', pom: '#ff3040', wing: '#c03040',
        desc: 'It reads out the names of thirteen knights, one name a turn. By the last name the battle is usually long over.',
        abilities: ['summon_bond', 'dreadwyrm_trance'],
        learn: '38 e4_knights_round, 41 shield_bash, 44 calamity, 47 drizzle',
        habitat: 'ruins', rarity: 'rare', class: 'normal',
      },

      // ---- Amethymog: Independent Materia (one stage)
      amethymog_plus_adept: {
        moogle: 'Amethymog', job: 'e4_plus_adept', type: 'timemage', type2: 'whitemage', base: S(85, 60, 85, 85, 85, 80),
        rate: 55, exp: 195, curve: 'medium', fur: '#f2ecf8', pom: '#b060ff', wing: '#8a5ac0',
        desc: 'A purple orb that adds a little to everything: speed, strength, luck, even lunch. Divers find them in sunken airships.',
        abilities: ['e4_all_plus', 'fast_learner'],
        learn: '1 tick_tock, 1 haste, 5 holy_glare, 9 temperance, 13 quick_spell, 17 starshower, 21 cure, 25 comet, 29 holy_glare, 33 regen_spell, 36 old_spell, 39 holy, 43 starshower, 47 meteor',
        habitat: 'sea', rarity: 'rare', class: 'normal',
      },

      // ---- Execmog: the Shinra corporate ladder (Bard, then Thief)
      execmog_intern: {
        moogle: 'Execmog', job: 'e4_intern', type: 'bard', base: S(55, 40, 50, 60, 45, 40),
        rate: 200, exp: 56, curve: 'fast', fur: '#ece8e2', pom: '#e8b020', nose: '#c03030',
        evo: { at: 20, to: 'execmog_executive' },
        desc: 'Fetches coffee for all seventy floors of the Shinra Building. In its dreams it has a corner office; in life, a closet.',
        abilities: ['coin_up', 'menace'],
        learn: '1 sonic_chord, 1 pout, 4 errand_run, 8 heckle_riff, 12 battle_song, 16 crescendo, 20 insult, 24 sonic_chord, 28 gil_toss, 32 high_note, 37 crescendo, 42 mic_drop',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      execmog_executive: {
        moogle: 'Execmog', job: 'e4_executive', type: 'bard', type2: 'thief', base: S(75, 55, 65, 85, 65, 60),
        rate: 90, exp: 140, curve: 'fast', fur: '#ece8e2', pom: '#e8b020', nose: '#c03030',
        evo: { at: 36, to: 'execmog_president' },
        desc: "Promoted for laughing loudest at the boss's jokes. Its briefcase holds one memo and forty Kupo Nuts.",
        abilities: ['coin_up', 'menace'],
        learn: '20 cloak_dagger, 23 love_sonata, 26 high_note, 29 sonic_chord, 32 grand_heist, 35 heros_rime, 38 cloak_dagger, 42 mic_drop',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      execmog_president: {
        moogle: 'Execmog', job: 'e4_president', type: 'bard', type2: 'thief', base: S(95, 65, 80, 110, 85, 75),
        rate: 45, exp: 238, curve: 'fast', fur: '#ece8e2', pom: '#e8b020', nose: '#c03030',
        desc: 'Runs a whole power company from a gold-trimmed chair. Every speech ends in fireworks and a small rate increase.',
        abilities: ['coin_up', 'menace'],
        learn: '36 buckshot, 39 dusk_requiem, 42 insult, 45 symphony, 48 sonic_chord',
        habitat: 'town', rarity: 'common', class: 'normal',
      },

      // ---- Clodkin: Weapons Development (Machinist, then Knight)
      clodkin_arms_tester: {
        moogle: 'Clodkin', job: 'e4_arms_tester', type: 'machinist', base: S(70, 75, 80, 40, 50, 25),
        rate: 150, exp: 64, curve: 'slow', fur: '#ecdcdc', pom: '#ff2030',
        evo: { at: 28, to: 'clodkin_clod_pilot' },
        desc: "Test-fires the weapons department's newest toys. Its eyebrows have grown back four times this year.",
        abilities: ['heavy_armor', 'gun_mastery'],
        learn: '1 wrench, 1 blue_screw, 4 rivet_gun, 8 scattergun, 12 wrench, 16 piston_punch, 20 big_shot, 24 rivet_gun, 28 mine_layer, 32 drill, 36 wrench, 41 cave_in',
        habitat: 'factory', rarity: 'uncommon', class: 'normal',
      },
      clodkin_clod_pilot: {
        moogle: 'Clodkin', job: 'e4_clod_pilot', type: 'machinist', type2: 'knight', base: S(100, 120, 125, 55, 75, 40),
        rate: 55, exp: 212, curve: 'slow', fur: '#ecdcdc', pom: '#ff2030',
        desc: 'Pilots a walking tank twelve times its size and cackles over the intercom. The tank does most of the work.',
        abilities: ['heavy_armor', 'gun_mastery'],
        learn: '28 aegis_slam, 31 gyro_grinder, 34 shield_bash, 37 sheltron, 40 kupo_missile, 43 rivet_gun, 46 entrench',
        habitat: 'factory', rarity: 'uncommon', class: 'normal',
      },

      // ---- Riotmog: Public Safety (Knight, then Beast)
      riotmog_shinra_mp: {
        moogle: 'Riotmog', job: 'e4_shinra_mp', type: 'knight', base: S(65, 70, 75, 30, 45, 45),
        rate: 160, exp: 62, curve: 'medium', fur: '#e6e8ee', pom: '#3a6ae0',
        evo: { at: 25, to: 'riotmog_hound_captain' },
        desc: 'Directs traffic on the harbor docks with a baton and a whistle. It writes tickets to seagulls, on principle.',
        abilities: ['menace', 'auto_protect'],
        learn: '1 shield_bash, 1 hold_the_line, 4 bounce, 8 challenge, 12 rend_weapon, 16 shield_bash, 20 sheltron, 24 retribution, 28 bounce, 33 iron_wall, 38 mow_down, 43 shield_bash',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },
      riotmog_hound_captain: {
        moogle: 'Riotmog', job: 'e4_hound_captain', type: 'knight', type2: 'beast', base: S(90, 105, 105, 40, 70, 85),
        rate: 65, exp: 206, curve: 'medium', fur: '#e6e8ee', pom: '#3a6ae0',
        desc: 'Leads a pack of robot guard hounds and laughs very loudly at its own orders. The hounds would rather go for a walk.',
        abilities: ['menace', 'auto_protect'],
        learn: '25 bite, 28 paw_swat, 31 behemoth_roar, 34 bite, 37 judgment_blade, 40 saint_cross, 43 naga_fang, 46 bite',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },

      // ---- Avamog: AVALANCHE (Thief, then Machinist)
      avamog_lookout: {
        moogle: 'Avamog', job: 'e4_lookout', type: 'thief', base: S(50, 65, 45, 35, 40, 65),
        rate: 190, exp: 58, curve: 'medium', fur: '#efe8dc', pom: '#40c060', wing: '#4a7a4a',
        evo: { at: 17, to: 'avamog_saboteur' },
        desc: 'Keeps watch outside a bar in the slums. It whistles twice for Shinra and three times for snacks.',
        abilities: ['desperado', 'bomb_body'],
        learn: '1 mug, 1 trip, 4 quickhit, 8 makibishi, 12 cloak_dagger, 16 trick_attack, 20 mug, 24 viper_fang, 28 smoke, 32 quickhit, 37 throw, 42 mug',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },
      avamog_saboteur: {
        moogle: 'Avamog', job: 'e4_saboteur', type: 'thief', type2: 'machinist', base: S(65, 90, 60, 50, 55, 90),
        rate: 90, exp: 142, curve: 'medium', fur: '#efe8dc', pom: '#40c060', wing: '#4a7a4a',
        evo: { at: 33, to: 'avamog_reactor_raider' },
        desc: "Builds its bombs in a tin lunchbox and labels every one 'not lunch'. It has had exactly one bad lunch.",
        abilities: ['desperado', 'bomb_body'],
        learn: '17 mine_layer, 20 wrench, 23 scattergun, 26 wildfire_oil, 29 mug, 32 piston_punch, 35 wrench, 39 pandora, 44 mug',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },
      avamog_reactor_raider: {
        moogle: 'Avamog', job: 'e4_reactor_raider', type: 'thief', type2: 'machinist', base: S(80, 120, 75, 60, 70, 115),
        rate: 45, exp: 238, curve: 'medium', fur: '#efe8dc', pom: '#40c060', wing: '#4a7a4a',
        desc: 'Fights for the Planet one reactor at a time. It plants a seedling at every blast site to make up for the noise.',
        abilities: ['desperado', 'bomb_body'],
        learn: '33 tek_missile, 36 cloak_dagger, 39 makibishi, 42 grand_heist, 45 wrench, 48 kupo_missile',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },

      // ---- Slumkin: the slums under the plate (Machinist, then Warrior)
      slumkin_scavenger: {
        moogle: 'Slumkin', job: 'e4_scavenger', type: 'machinist', base: S(60, 70, 60, 35, 45, 50),
        rate: 200, exp: 58, curve: 'fast', fur: '#e2dcd2', pom: '#ff9030',
        evo: { at: 24, to: 'slumkin_junk_baron' },
        desc: 'Picks through the junk heaps under the plate for parts. Everything it owns used to be part of a train.',
        abilities: ['scrap_eater', 'grit'],
        learn: '1 wrench, 1 pout, 4 pickaxe, 8 scattergun, 12 swap_parts, 16 wrench, 20 drill, 24 gizmo, 28 blue_screw, 32 wrench, 36 cave_in, 41 gizmo',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },
      slumkin_junk_baron: {
        moogle: 'Slumkin', job: 'e4_junk_baron', type: 'machinist', type2: 'warrior', base: S(85, 110, 90, 45, 70, 85),
        rate: 70, exp: 204, curve: 'fast', fur: '#e2dcd2', pom: '#ff9030',
        desc: 'Rules a kingdom of scrap from a throne of old tires. Its sword is a bent rebar, and its crown is a gear.',
        abilities: ['scrap_eater', 'grit'],
        learn: '24 slash, 27 full_break, 30 piston_punch, 33 gizmo, 36 blade_beam, 39 bravery, 42 fell_cleave, 45 slash, 48 cave_in',
        habitat: 'factory', rarity: 'common', class: 'normal',
      },

      // ---- Glamkupo: Wall Market (Bard, then Monk)
      glamkupo_backup_dancer: {
        moogle: 'Glamkupo', job: 'e4_backup_dancer', type: 'bard', base: S(50, 50, 40, 65, 45, 60),
        rate: 170, exp: 60, curve: 'fast', fur: '#faf0f4', pom: '#ff50a0',
        evo: { at: 22, to: 'glamkupo_honey_star' },
        desc: 'Dances in the back row of the best show in Wall Market. It knows every step, plus four the lead forgot.',
        abilities: ['sylph_dance', 'charm'],
        learn: '1 sonic_chord, 1 love_sonata, 4 juggle, 8 snowman_jazz, 12 tempt, 16 sonic_chord, 20 dusk_requiem, 24 moonlit_waltz, 28 hymn, 32 high_note, 36 crescendo, 41 symphony',
        habitat: 'night', rarity: 'common', class: 'normal',
      },
      glamkupo_honey_star: {
        moogle: 'Glamkupo', job: 'e4_honey_star', type: 'bard', type2: 'monk', base: S(70, 80, 60, 100, 65, 105),
        rate: 70, exp: 204, curve: 'fast', fur: '#faf0f4', pom: '#ff50a0',
        desc: 'Top act of the honey-themed inn. A dance-off with it ends with the whole street dancing along, every one in a wig.',
        abilities: ['sylph_dance', 'charm'],
        learn: '22 kick, 25 moonlit_waltz, 28 chi_blast, 31 hymn, 34 nocturne, 37 drop_the_beat, 40 sonic_chord, 44 aria, 47 chi_blast',
        habitat: 'night', rarity: 'common', class: 'normal',
      },

      // ---- Derbymog: Chocobo Square (Beast, then Dragoon)
      derbymog_jockey: {
        moogle: 'Derbymog', job: 'e4_jockey', type: 'beast', base: S(50, 65, 45, 30, 40, 80),
        rate: 180, exp: 60, curve: 'medium', fur: '#f8eecc', pom: '#ffd820', wing: '#e0b030',
        evo: { at: 26, to: 'derbymog_s_class_racer' },
        desc: 'Rides chocobos at the desert racetrack and chats to them the whole way round. The chocobos tune it out.',
        abilities: ['auto_haste', 'wyvern_wings'],
        learn: '1 choco_kick, 1 roar, 4 nimble_pounce, 8 dash, 12 choco_kick, 16 wildcat_swipes, 20 chocobo_rush, 24 tailwind, 28 choco_kick, 32 lasso, 36 stampede, 41 choco_kick',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },
      derbymog_s_class_racer: {
        moogle: 'Derbymog', job: 'e4_s_class_racer', type: 'beast', type2: 'dragoon', base: S(75, 105, 65, 40, 65, 140),
        rate: 60, exp: 208, curve: 'medium', fur: '#f8eecc', pom: '#ffd820', wing: '#e0b030',
        desc: 'Has won every S-Class race the track has ever run. A black chocobo it once rode still sends it letters.',
        abilities: ['auto_haste', 'wyvern_wings'],
        learn: '26 hurdle, 29 leg_sweep, 32 wyrm_dance, 35 choco_kick, 38 dive_bomb, 41 wildcat_swipes, 44 choco_meteor, 47 hurdle',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },

      // ---- Arenakupo: Battle Square (Warrior, then Monk)
      arenakupo_arena_rookie: {
        moogle: 'Arenakupo', job: 'e4_arena_rookie', type: 'warrior', base: S(65, 80, 55, 30, 45, 55),
        rate: 150, exp: 62, curve: 'medium', fur: '#f2e4d6', pom: '#ff4020',
        evo: { at: 25, to: 'arenakupo_square_champion' },
        desc: "Fights in the arena with a new handicap every round. Today it can't use its wings, so it's using both feet.",
        abilities: ['sleepless_fury', 'battle_scars'],
        learn: '1 slash, 1 warcry, 4 kick, 8 inner_beast, 12 slash, 16 vengeance, 20 bravery, 24 kick, 28 full_break, 32 slash, 36 onslaught, 41 kick',
        habitat: 'desert', rarity: 'uncommon', class: 'normal',
      },
      arenakupo_square_champion: {
        moogle: 'Arenakupo', job: 'e4_square_champion', type: 'warrior', type2: 'monk', base: S(95, 125, 80, 40, 70, 90),
        rate: 60, exp: 210, curve: 'medium', fur: '#f2e4d6', pom: '#ff4020',
        desc: 'The arena champion, oiled and beaming. The worse the handicap it draws, the harder it seems to hit.',
        abilities: ['sleepless_fury', 'battle_scars'],
        learn: '25 one_inch_punch, 28 holmgang, 31 tiger_break, 34 slash, 37 inner_release, 40 inner_beast, 43 fell_cleave, 46 kick',
        habitat: 'desert', rarity: 'uncommon', class: 'normal',
      },

      // ---- Bellboo: the Ghost Hotel (Summoner, then Time Mage)
      bellboo_bellhop: {
        moogle: 'Bellboo', job: 'e4_bellhop', type: 'summoner', base: S(60, 35, 50, 65, 60, 30),
        rate: 150, exp: 62, curve: 'medium', fur: '#eceef8', pom: '#b080ff', wing: '#8a80b0',
        evo: { at: 27, to: 'bellboo_night_manager' },
        desc: "Carries luggage at a haunted hotel. Your bags always arrive, though usually in a room that doesn't exist.",
        abilities: ['shadowbringer', 'tonberry_grudge', 'time_twister'],
        learn: '1 haunt, 1 spook, 4 dread_shade, 8 ectoplasm, 12 haunt, 16 nightfall, 20 grave_breath, 24 haunt, 28 runaway_train, 32 voodoo_doll, 36 starlight, 41 ghost_train',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },
      bellboo_night_manager: {
        moogle: 'Bellboo', job: 'e4_night_manager', type: 'summoner', type2: 'timemage', base: S(90, 50, 75, 100, 95, 60),
        rate: 65, exp: 210, curve: 'medium', fur: '#eceef8', pom: '#b080ff', wing: '#8a80b0',
        desc: 'Runs the front desk after midnight. Check-out is at noon, but none of the guests remember checking in.',
        abilities: ['shadowbringer', 'tonberry_grudge', 'time_twister'],
        learn: '27 tick_tock, 30 phantom_fade, 33 slowga, 36 haunt, 39 immobilize, 42 ghost_train, 45 tick_tock, 48 graviga',
        habitat: 'night', rarity: 'uncommon', class: 'normal',
      },

      // ---- Cosmopom: Cosmo Canyon (White Mage, then Time Mage)
      cosmopom_candle_keeper: {
        moogle: 'Cosmopom', job: 'e4_candle_keeper', type: 'whitemage', base: S(55, 30, 45, 60, 65, 35),
        rate: 160, exp: 60, curve: 'slow', fur: '#f6ece0', pom: '#ff7a30', wing: '#c06a40',
        evo: { at: 19, to: 'cosmopom_star_scholar' },
        desc: 'Keeps the great candle of the canyon burning. It has never once let it go out, though it sneezes near it a lot.',
        abilities: ['mako_spring', 'healing_pom', 'pom_wings'],
        learn: '1 holy_glare, 1 cure, 4 aero, 8 banishga, 12 regen_spell, 16 holy_glare, 20 temperance, 24 aero, 28 aerora, 32 liturgy_bell, 36 holy_glare, 41 holy',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },
      cosmopom_star_scholar: {
        moogle: 'Cosmopom', job: 'e4_star_scholar', type: 'whitemage', type2: 'timemage', base: S(75, 40, 60, 85, 95, 45),
        rate: 80, exp: 145, curve: 'slow', fur: '#f6ece0', pom: '#ff7a30', wing: '#c06a40',
        evo: { at: 36, to: 'cosmopom_planet_elder' },
        desc: 'Studies the life of the Planet in a dome full of floating stars. Ho ho hum, it says, for no reason at all.',
        abilities: ['mako_spring', 'healing_pom', 'pom_wings'],
        learn: '19 starlight, 22 cure, 25 banishga, 28 comet, 31 starlight, 34 wellspring, 37 temperance, 40 holy_glare, 44 meteor, 48 starlight',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },
      cosmopom_planet_elder: {
        moogle: 'Cosmopom', job: 'e4_planet_elder', type: 'whitemage', type2: 'timemage', base: S(95, 45, 75, 115, 125, 55),
        rate: 45, exp: 240, curve: 'slow', fur: '#f6ece0', pom: '#ff7a30', wing: '#c06a40',
        desc: 'Old enough to remember when the stars were new. It floats a foot off the ground and listens to the Planet hum.',
        abilities: ['mako_spring', 'healing_pom', 'pom_wings'],
        learn: '36 weightless, 39 holy_glare, 42 holy, 45 cure, 48 meteor',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal',
      },

      // ---- Nibelpom: Nibelheim and Mt. Nibel (Ranger, then Monk)
      nibelpom_trail_guide: {
        moogle: 'Nibelpom', job: 'e4_trail_guide', type: 'ranger', base: S(55, 70, 55, 35, 45, 60),
        rate: 170, exp: 60, curve: 'medium', fur: '#efe8e0', pom: '#e04040',
        evo: { at: 23, to: 'nibelpom_peak_guide' },
        desc: 'Guides hikers up the mountain behind its little home town. It knows a shortcut, and the shortcut knows it.',
        abilities: ['raging_strikes', 'brawler_soul'],
        learn: '1 arrow, 1 leg_shot, 4 kick, 8 snare_line, 12 arrow, 16 web_snare, 20 sharpshot, 24 arrow, 28 aim_wing, 32 eagle_eye, 36 arrow, 41 apex_arrow',
        habitat: 'mountain', rarity: 'common', class: 'normal',
      },
      nibelpom_peak_guide: {
        moogle: 'Nibelpom', job: 'e4_peak_guide', type: 'ranger', type2: 'monk', base: S(80, 110, 75, 45, 70, 105),
        rate: 65, exp: 206, curve: 'medium', fur: '#efe8e0', pom: '#e04040',
        desc: 'Swapped its rope for gloves and climbs the peak bare-pawed. The wolves on the slopes step aside for it.',
        abilities: ['raging_strikes', 'brawler_soul'],
        learn: '23 combo_chain, 26 dolphin_blow, 29 arrow, 32 whirlwind, 35 one_inch_punch, 38 combo_chain, 41 heel_drop, 44 headshot, 47 arrow',
        habitat: 'mountain', rarity: 'common', class: 'normal',
      },

      // ---- Rocketpom: Rocket Town (Machinist, then Dragoon)
      rocketpom_launch_tech: {
        moogle: 'Rocketpom', job: 'e4_launch_tech', type: 'machinist', base: S(55, 65, 55, 35, 40, 50),
        rate: 180, exp: 60, curve: 'medium', fur: '#eee8e2', pom: '#ff6020', wing: '#a05030',
        evo: { at: 18, to: 'rocketpom_test_pilot' },
        desc: 'Tightens bolts on a rocket that has been waiting years to launch. It drinks a lot of tea, mostly to stay busy.',
        abilities: ['daredevil', 'overheat', 'accelerate'],
        learn: '1 rivet_gun, 1 eureka, 4 wrench, 8 bio_blaster, 12 air_anchor, 16 rivet_gun, 20 drill, 24 gizmo, 28 big_shot, 32 wrench, 36 kupo_missile, 41 gizmo',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },
      rocketpom_test_pilot: {
        moogle: 'Rocketpom', job: 'e4_test_pilot', type: 'machinist', type2: 'dragoon', base: S(70, 90, 70, 45, 55, 80),
        rate: 85, exp: 145, curve: 'medium', fur: '#eee8e2', pom: '#ff6020', wing: '#a05030',
        evo: { at: 35, to: 'rocketpom_rocketeer' },
        desc: 'Flies anything with an engine, and a few things without one. Its goggles have never once been clean.',
        abilities: ['daredevil', 'overheat', 'accelerate'],
        learn: '18 thrust, 21 soul_jump, 24 air_anchor, 27 thrust, 30 wyrm_dance, 33 dive_bomb, 36 thrust, 40 wyvern_crash, 45 rivet_gun',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },
      rocketpom_rocketeer: {
        moogle: 'Rocketpom', job: 'e4_rocketeer', type: 'machinist', type2: 'dragoon', base: S(85, 125, 85, 55, 70, 105),
        rate: 45, exp: 240, curve: 'medium', fur: '#eee8e2', pom: '#ff6020', wing: '#a05030',
        desc: 'Captain of a rusty rocket that finally flew. It still talks about the stars, and nobody minds hearing it again.',
        abilities: ['daredevil', 'overheat', 'accelerate'],
        learn: '35 stardiver, 38 thrust, 41 hypercharge, 44 wyvern_crash, 47 rivet_gun',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },

      // ---- Pagodamog: Wutai's pagoda (Monk, then Summoner)
      pagodamog_pagoda_pupil: {
        moogle: 'Pagodamog', job: 'e4_pagoda_pupil', type: 'monk', base: S(60, 65, 55, 30, 45, 45),
        rate: 160, exp: 62, curve: 'slow', fur: '#f0ece0', pom: '#30c090', wing: '#3a8a6a',
        evo: { at: 20, to: 'pagodamog_floor_guardian' },
        desc: 'Trains on the ground floor of the great pagoda. It has climbed the stairs a thousand times and fought nobody yet.',
        abilities: ['riddle_of_fire', 'zen_mind'],
        learn: '1 palm_strike, 1 kiai, 4 kick, 8 grapple, 12 aura_bolt, 16 palm_strike, 20 mantra, 24 one_inch_punch, 28 kunai, 32 riddle_of_earth, 36 palm_strike, 41 pummel',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },
      pagodamog_floor_guardian: {
        moogle: 'Pagodamog', job: 'e4_floor_guardian', type: 'monk', type2: 'summoner', base: S(80, 90, 75, 50, 60, 60),
        rate: 80, exp: 146, curve: 'slow', fur: '#f0ece0', pom: '#30c090', wing: '#3a8a6a',
        evo: { at: 36, to: 'pagodamog_pagoda_lord' },
        desc: "Guards one floor of the pagoda and won't let you up without a fight, a bow and a short lecture.",
        abilities: ['riddle_of_fire', 'zen_mind'],
        learn: '20 haunt, 23 karma_knife, 26 meditation, 29 one_inch_punch, 32 tsuppari, 35 earth_render, 38 haunt, 42 perfect_counter, 46 brute_force',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },
      pagodamog_pagoda_lord: {
        moogle: 'Pagodamog', job: 'e4_pagoda_lord', type: 'monk', type2: 'summoner', base: S(100, 115, 85, 85, 70, 70),
        rate: 45, exp: 242, curve: 'slow', fur: '#f0ece0', pom: '#30c090', wing: '#3a8a6a',
        desc: 'Waits atop the pagoda with three faces: one calm, one stern and one deeply disappointed in your form.',
        abilities: ['riddle_of_fire', 'zen_mind'],
        learn: '36 seance, 39 palm_strike, 42 tidal_wave, 45 six_sided_star, 48 haunt',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },

      // ---- Junopom: Junon (Ranger, then Bard)
      junopom_parade_cadet: {
        moogle: 'Junopom', job: 'e4_parade_cadet', type: 'ranger', base: S(55, 65, 50, 50, 45, 45),
        rate: 180, exp: 60, curve: 'medium', fur: '#eef0f6', pom: '#3a7aff',
        evo: { at: 21, to: 'junopom_drum_major' },
        desc: "Marches in the harbor town's parade and twirls its rifle right on cue. On a good day it even catches it.",
        abilities: ['gun_mastery', 'battle_ready'],
        learn: '1 snap_shot, 1 hunters_mark, 4 bayonet, 8 musket, 12 snap_shot, 16 camouflage, 20 buckshot, 24 shadowbind, 28 snap_shot, 32 cannon, 36 buckshot, 41 broadside',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },
      junopom_drum_major: {
        moogle: 'Junopom', job: 'e4_drum_major', type: 'ranger', type2: 'bard', base: S(80, 100, 75, 80, 65, 80),
        rate: 70, exp: 204, curve: 'medium', fur: '#eef0f6', pom: '#3a7aff',
        desc: 'Leads the parade with a baton and a booming band. The great cannon above the town fires once for every encore.',
        abilities: ['gun_mastery', 'battle_ready'],
        learn: '21 sonic_chord, 24 wind_song, 27 musket, 30 snap_shot, 33 high_note, 36 buckshot, 39 eagle_eye, 42 broadside, 45 sonic_chord, 48 big_top',
        habitat: 'beach', rarity: 'common', class: 'normal',
      },

      // ---- Airkupo: the Highwind's crew (Dragoon, then Ranger)
      airkupo_deckhand: {
        moogle: 'Airkupo', job: 'e4_deckhand', type: 'dragoon', base: S(50, 65, 45, 35, 40, 75),
        rate: 180, exp: 58, curve: 'fast', fur: '#eef2f8', pom: '#40a0ff', wing: '#5a7ab0',
        evo: { at: 24, to: 'airkupo_helmsman' },
        desc: 'Mops the deck of a great airship and is airsick by the second turn of the propeller. It has never once complained.',
        abilities: ['pom_wings', 'eye_of_storm'],
        learn: '1 thrust, 1 tailwind, 4 pom_lance, 8 leg_sweep, 12 thrust, 16 reiss_wind, 20 harpoon, 24 thrust, 28 dive_bomb, 32 wyrmwind, 36 pom_lance, 41 high_jump',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },
      airkupo_helmsman: {
        moogle: 'Airkupo', job: 'e4_helmsman', type: 'dragoon', type2: 'ranger', base: S(70, 105, 65, 45, 60, 130),
        rate: 70, exp: 204, curve: 'fast', fur: '#eef2f8', pom: '#40a0ff', wing: '#5a7ab0',
        desc: "Steers the airship through storms with a harpoon at its side. It calls everyone Cap'n, including the cat.",
        abilities: ['pom_wings', 'eye_of_storm'],
        learn: '24 aim_wing, 27 cast_line, 30 soul_jump, 33 thrust, 36 repelling_shot, 39 pom_lance, 42 broadside, 45 highwind, 48 cast_line',
        habitat: 'sky', rarity: 'common', class: 'normal',
      },

      // ---- Banopom: Banora's apples, LOVELESS, and a crimson wing (Beast, Bard, Warrior)
      banopom_orchard_hand: {
        moogle: 'Banopom', job: 'e4_orchard_hand', type: 'beast', base: S(55, 55, 50, 50, 45, 45),
        rate: 180, exp: 58, curve: 'medium', fur: '#f6ecdc', pom: '#e03040', nose: '#a02030', wing: '#b03040',
        evo: { at: 18, to: 'banopom_loveless_poet' },
        desc: 'Tends apple trees in a sleepy village and hands the odd purple apples out to anyone who wanders past.',
        abilities: ['auto_regen', 'grand_finale', 'limit_break'],
        learn: '1 acorn, 1 e4_dumbapple, 4 hedge_clip, 8 tanglevine, 12 thorn_whip, 16 acorn, 20 spore, 24 topiary, 28 hedge_clip, 32 wellspring, 36 acorn, 41 stampede',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },
      banopom_loveless_poet: {
        moogle: 'Banopom', job: 'e4_loveless_poet', type: 'bard', type2: 'beast', base: S(70, 65, 60, 90, 65, 60),
        rate: 80, exp: 145, curve: 'medium', fur: '#f6ecdc', pom: '#e03040', nose: '#a02030', wing: '#b03040',
        evo: { at: 34, to: 'banopom_crimson_wing' },
        desc: "Recites an old play about a goddess's gift, act by act, to anyone who stands still. Nobody knows how it ends.",
        abilities: ['auto_regen', 'grand_finale', 'limit_break'],
        learn: '18 hymn, 21 love_sonata, 24 dusk_requiem, 27 hymn, 30 nocturne, 33 high_note, 36 crescendo, 40 aria, 45 hymn',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },
      banopom_crimson_wing: {
        moogle: 'Banopom', job: 'e4_crimson_wing', type: 'warrior', type2: 'bard', base: S(85, 100, 75, 115, 75, 80),
        rate: 45, exp: 245, curve: 'medium', fur: '#f6ecdc', pom: '#e03040', nose: '#a02030', wing: '#b03040',
        desc: 'One crimson wing, one red blade and an apple in its pocket. It quotes the old play while it fights, badly.',
        abilities: ['auto_regen', 'grand_finale', 'limit_break'],
        learn: '34 blade_beam, 37 slash, 40 aria, 43 heros_rime, 46 fell_cleave',
        habitat: 'forest', rarity: 'uncommon', class: 'normal',
      },

      // ---- Wingmog: a white-winged SOLDIER (one stage)
      wingmog_white_wing: {
        moogle: 'Wingmog', job: 'e4_white_wing', type: 'warrior', type2: 'whitemage', base: S(95, 105, 95, 65, 80, 55),
        rate: 55, exp: 195, curve: 'slow', fur: '#f6f6fa', pom: '#c0e0ff', wing: '#f0f0f8',
        desc: "Carries a great sword it won't draw, so it never wears out. One white wing, and a long talk about honor.",
        abilities: ['hold_fast', 'devotion'],
        learn: '1 slash, 1 cover, 5 holy_glare, 9 holy_mace, 13 slash, 17 temperance, 21 blade_beam, 25 holy_glare, 29 reraise, 33 braver, 37 slash, 41 angel_wing, 45 hallowed_bolt, 48 holy_glare',
        habitat: 'snow', rarity: 'rare', class: 'normal',
      },

      // ---- Deepkupo: Deepground, the pseudo-legendary (Knight, then Black Mage)
      deepkupo_deep_cadet: {
        moogle: 'Deepkupo', job: 'e4_deep_cadet', type: 'knight', base: S(55, 65, 60, 45, 40, 35),
        rate: 45, exp: 62, curve: 'slow', fur: '#d4d0dc', pom: '#c01830', nose: '#801020', wing: '#2a2030',
        evo: { at: 30, to: 'deepkupo_restrictor' },
        desc: 'Raised in the dark far below the city, it has never once seen the sky. It thinks sunlight is just a rumor.',
        abilities: ['e4_limiter_off', 'piercing'],
        learn: '1 shield_bash, 1 hold_the_line, 4 drain, 8 keen_edge, 12 rend_weapon, 16 sanguine_sword, 20 keen_edge, 24 blood_price, 28 shield_bash, 32 darkside, 36 keen_edge, 41 living_dead, 45 entrench',
        habitat: 'crater', rarity: 'rare', class: 'pseudo',
      },
      deepkupo_restrictor: {
        moogle: 'Deepkupo', job: 'e4_restrictor', type: 'knight', type2: 'blackmage', base: S(75, 95, 80, 70, 60, 50),
        rate: 45, exp: 150, curve: 'slow', fur: '#d4d0dc', pom: '#c01830', nose: '#801020', wing: '#2a2030',
        evo: { at: 45, to: 'deepkupo_tsviet' },
        desc: 'Wears a collar that keeps its power locked down. It fiddles with the clasp whenever it thinks nobody is watching.',
        abilities: ['e4_limiter_off', 'piercing'],
        learn: '30 e4_twin_gunblades, 33 scathe, 36 darkness, 39 keen_edge, 42 bravery, 45 nether_blaze, 48 scathe',
        habitat: 'crater', rarity: 'rare', class: 'pseudo',
      },
      deepkupo_tsviet: {
        moogle: 'Deepkupo', job: 'e4_tsviet', type: 'knight', type2: 'blackmage', base: S(100, 135, 100, 105, 80, 80),
        rate: 45, exp: 260, curve: 'slow', fur: '#d4d0dc', pom: '#c01830', nose: '#801020', wing: '#2a2030',
        desc: 'The elite of the deep, a gunblade in each paw and wings of shadow. When its limiter comes off, the lights go out.',
        abilities: ['e4_limiter_off', 'piercing'],
        learn: '45 e4_twin_gunblades, 46 keen_edge, 48 darkside',
        habitat: 'crater', rarity: 'rare', class: 'pseudo',
      },

      // ---- Courikupo: a delivery service in the rebuilt city (Freelancer, then Machinist)
      courikupo_courier: {
        moogle: 'Courikupo', job: 'e4_courier', type: 'freelancer', base: S(50, 65, 50, 30, 45, 70),
        rate: 190, exp: 58, curve: 'fast', fur: '#ecebf0', pom: '#40d0ff',
        evo: { at: 22, to: 'courikupo_road_rider' },
        desc: 'Runs parcels across the rebuilt city on foot. If a parcel says undeliverable, it delivers it anyway.',
        abilities: ['auto_haste', 'kupo_spirit', 'magitek_infusion'],
        learn: '1 errand_run, 1 pout, 4 pom_bop, 8 dash, 12 errand_run, 16 mognet_relay, 20 trailblaze, 24 pom_bop, 28 kupo_charge, 32 errand_run, 36 rivet_gun, 41 kupo_rush',
        habitat: 'desert', rarity: 'common', class: 'normal',
      },
      courikupo_road_rider: {
        moogle: 'Courikupo', job: 'e4_road_rider', type: 'freelancer', type2: 'machinist', base: S(75, 110, 70, 40, 65, 125),
        rate: 70, exp: 206, curve: 'fast', fur: '#ecebf0', pom: '#40d0ff',
        desc: 'Delivers anything, anywhere, on a huge black motorbike. Its phone rings all day long and it never picks up.',
        abilities: ['auto_haste', 'kupo_spirit', 'magitek_infusion'],
        learn: '22 rivet_gun, 25 air_anchor, 28 dash, 31 mognet_relay, 34 rivet_gun, 37 trailblaze, 40 hypercharge, 43 pom_bop, 46 kupo_missile',
        habitat: 'desert', rarity: 'common', class: 'normal',
      },

      // ---- Kupokid: the Moogle Emporium's kids (Freelancer, then Thief)
      kupokid_mog_kid: {
        moogle: 'Kupokid', job: 'e4_mog_kid', type: 'freelancer', base: S(45, 50, 40, 40, 40, 65),
        rate: 255, exp: 50, curve: 'fast', fur: '#f8f2ea', pom: '#ff5a70', wing: '#d07080',
        evo: { at: 15, to: 'kupokid_emporium_clerk' },
        desc: "One of a gang of moogle kids who scatter the moment you look away. Catch one and it giggles; let go and it's gone.",
        abilities: ['kupo_panic', 'coin_up'],
        learn: '1 pom_bop, 1 peekaboo, 4 wing_flutter, 8 pom_dust, 12 pom_flurry, 16 mognet_relay, 20 pom_bop, 24 copycat, 28 wing_flutter, 32 yell, 36 pilfer, 40 pom_flurry, 44 kupo_rush',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      kupokid_emporium_clerk: {
        moogle: 'Kupokid', job: 'e4_emporium_clerk', type: 'freelancer', type2: 'thief', base: S(60, 75, 55, 50, 55, 95),
        rate: 120, exp: 130, curve: 'fast', fur: '#f8f2ea', pom: '#ff5a70', wing: '#d07080',
        evo: { at: 32, to: 'kupokid_mog_merchant' },
        desc: 'Minds the counter at the moogle emporium. It takes payment in medals, Kupo Nuts and good stories.',
        abilities: ['kupo_panic', 'coin_up'],
        learn: '15 pilfer, 18 steal, 21 sleight_of_hand, 24 thievery, 27 pom_flurry, 30 mognet_relay, 34 grand_heist, 38 pilfer, 42 coup_de_grace, 46 kupo_rush',
        habitat: 'town', rarity: 'common', class: 'normal',
      },
      kupokid_mog_merchant: {
        moogle: 'Kupokid', job: 'e4_mog_merchant', type: 'freelancer', type2: 'thief', base: S(80, 100, 70, 60, 70, 120),
        rate: 60, exp: 225, curve: 'fast', fur: '#f8f2ea', pom: '#ff5a70', wing: '#d07080',
        desc: 'Carries the whole shop on its back and sniffs out a deal anywhere. Its prices are fair, kupo. It promises, kupo.',
        abilities: ['kupo_panic', 'coin_up'],
        learn: '32 gil_toss, 35 pilfer, 38 grand_heist, 41 shift_break, 44 pom_flurry, 47 jackpot',
        habitat: 'town', rarity: 'common', class: 'normal',
      },

      // ---- Deckpom: Queen's Blood (Red Mage; Summoner at the end)
      deckpom_card_novice: {
        moogle: 'Deckpom', job: 'e4_card_novice', type: 'redmage', base: S(50, 40, 45, 65, 50, 45),
        rate: 160, exp: 60, curve: 'medium', fur: '#f4f0f4', pom: '#e03060', wing: '#a03050',
        evo: { at: 19, to: 'deckpom_card_duelist' },
        desc: 'Carries a deck of monster cards everywhere and challenges every passer-by to a game. It loses, then asks again.',
        abilities: ['finesse', 'vermilion_fury', 'wild_card'],
        learn: '1 card_trick, 1 mirage, 4 verstone, 8 mind_blast, 12 card_trick, 16 dualcast, 20 hat_trick, 24 card_trick, 28 resolution_spell, 32 magick_barrier, 36 verstone, 41 phantasm',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },
      deckpom_card_duelist: {
        moogle: 'Deckpom', job: 'e4_card_duelist', type: 'redmage', base: S(65, 55, 60, 90, 70, 65),
        rate: 80, exp: 145, curve: 'medium', fur: '#f4f0f4', pom: '#e03060', wing: '#a03050',
        evo: { at: 35, to: 'deckpom_card_queen' },
        desc: "Knows every card's rank and power by heart, and insists a three-lane board is the truest test of a moogle's soul.",
        abilities: ['finesse', 'vermilion_fury', 'wild_card'],
        learn: '19 jolt, 22 dispel_spell, 25 resolution_spell, 28 card_trick, 31 mana_balance, 34 dualcast, 37 card_trick, 41 verflare, 45 jolt',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },
      deckpom_card_queen: {
        moogle: 'Deckpom', job: 'e4_card_queen', type: 'redmage', type2: 'summoner', base: S(85, 65, 75, 120, 90, 85),
        rate: 45, exp: 240, curve: 'medium', fur: '#f4f0f4', pom: '#e03060', wing: '#a03050',
        desc: 'Champion of every card hall. Its cards climb out of the board to fight for it, and they bow to it first.',
        abilities: ['finesse', 'vermilion_fury', 'wild_card'],
        learn: '35 delta_attack, 38 card_trick, 41 living_muse, 44 verflare, 47 jolt',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },

      // ---- Condorpom: Fort Condor (Ranger, then Beast)
      condorpom_fort_lookout: {
        moogle: 'Condorpom', job: 'e4_fort_lookout', type: 'ranger', base: S(60, 65, 60, 35, 50, 50),
        rate: 160, exp: 62, curve: 'medium', fur: '#efe6d8', pom: '#e08030', wing: '#8a5a30',
        evo: { at: 26, to: 'condorpom_condor_marshal' },
        desc: "Watches the valley from a fort built around a giant bird's nest. It counts the invaders, and the eggs, every hour.",
        abilities: ['raging_strikes', 'arrow_guard'],
        learn: '1 arrow, 1 web_snare, 4 snap_shot, 8 minefield, 12 arrow, 16 flaming_arrow, 20 shield_wall, 24 arrow, 28 shadowbind, 32 seed_cannon, 36 snap_shot, 41 apex_arrow',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal',
      },
      condorpom_condor_marshal: {
        moogle: 'Condorpom', job: 'e4_condor_marshal', type: 'ranger', type2: 'beast', base: S(85, 100, 90, 45, 80, 90),
        rate: 65, exp: 208, curve: 'medium', fur: '#efe6d8', pom: '#e08030', wing: '#8a5a30',
        desc: "Moves the fort's tiny troops around like pieces on a board, while a great condor circles watchfully overhead.",
        abilities: ['raging_strikes', 'arrow_guard'],
        learn: '26 wildcat_swipes, 29 sidewinder, 32 behemoth_roar, 35 arrow, 38 camouflage, 41 wildcat_swipes, 44 feral_frenzy, 47 apex_arrow',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal',
      },

      // ---- Gambitkin: Gears and Gambits (one stage)
      gambitkin_gambiteer: {
        moogle: 'Gambitkin', job: 'e4_gambiteer', type: 'machinist', type2: 'redmage', base: S(80, 95, 90, 70, 80, 75),
        rate: 60, exp: 190, curve: 'medium', fur: '#ece4d6', pom: '#d0a040',
        desc: 'Wins tabletop wars with clockwork pieces it programs in advance. "Foe in range: strike." It wrote that rule.',
        abilities: ['wait_mode', 'amplifier'],
        learn: '1 gizmo, 1 en_garde, 5 riposte, 9 debilitator, 13 gizmo, 17 zwerchhau, 21 automaton, 25 piston_punch, 29 riposte, 33 swap_parts, 37 gizmo, 41 redoublement, 45 pandora, 48 riposte',
        habitat: 'town', rarity: 'uncommon', class: 'normal',
      },

      // ---- Nibblemog: the Mog House (Freelancer, then Dragoon)
      nibblemog_nut_nibbler: {
        moogle: 'Nibblemog', job: 'e4_nut_nibbler', type: 'freelancer', base: S(75, 55, 60, 35, 45, 30),
        rate: 220, exp: 55, curve: 'fast', fur: '#f8f4ec', pom: '#ff4a6a', wing: '#e06080',
        evo: { at: 20, to: 'nibblemog_sky_mog' },
        desc: "Too round to fly, it lives in an arcade where visitors feed it Kupo Nuts. It's getting there, slowly.",
        abilities: ['pom_fluff', 'kupo_spirit', 'featherweight'],
        learn: '1 pom_bop, 1 snack_break, 4 wing_flutter, 8 accumulate, 12 pom_bop, 16 kupo_toss, 20 wing_flutter, 24 dash, 28 snack_break, 32 pom_bop, 36 talon, 41 full_course',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },
      nibblemog_sky_mog: {
        moogle: 'Nibblemog', job: 'e4_sky_mog', type: 'freelancer', type2: 'dragoon', base: S(85, 95, 70, 45, 60, 115),
        rate: 75, exp: 200, curve: 'fast', fur: '#f8f4ec', pom: '#ff4a6a', wing: '#e06080',
        desc: 'Ate exactly enough Kupo Nuts to finally take off. It flaps proudly over the arcade, a little lopsided.',
        abilities: ['pom_fluff', 'kupo_spirit', 'featherweight'],
        learn: '20 talon, 23 skyward, 26 dive_bomb, 29 wing_flutter, 32 soul_jump, 35 wyrm_dance, 38 talon, 42 high_jump, 46 wing_flutter',
        habitat: 'grass', rarity: 'common', class: 'normal',
      },

      // ---- Datapom: a materia researcher's combat assignments (Time Mage, then Machinist)
      datapom_field_researcher: {
        moogle: 'Datapom', job: 'e4_field_researcher', type: 'timemage', base: S(50, 35, 45, 70, 50, 60),
        rate: 170, exp: 60, curve: 'medium', fur: '#eef0f4', pom: '#40c0ff',
        evo: { at: 24, to: 'datapom_battle_analyst' },
        desc: 'Hands out combat assignments from a clipboard and takes notes on everything you do. Mostly the mistakes.',
        abilities: ['libra', 'quickening', 'blue_learning'],
        learn: '1 tick_tock, 1 slow, 4 starshower, 8 premonition, 12 tick_tock, 16 demi_spell, 20 second_hand, 24 comet, 28 old_spell, 32 starshower, 36 celerity, 41 graviga',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal',
      },
      datapom_battle_analyst: {
        moogle: 'Datapom', job: 'e4_battle_analyst', type: 'timemage', type2: 'machinist', base: S(70, 50, 65, 110, 80, 105),
        rate: 70, exp: 208, curve: 'medium', fur: '#eef0f4', pom: '#40c0ff',
        desc: 'Built a battle simulator and fights its own data inside it. It has never lost to itself. It checked twice.',
        abilities: ['libra', 'quickening', 'blue_learning'],
        learn: '24 tracer_beam, 27 arc_relay, 30 starshower, 33 chronosphere, 36 shrink_ray, 39 tick_tock, 42 meteor, 45 celerity, 48 starshower',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal',
      },
    },

    // ------------------------------------------------------------------ the Kupodex order (line by line)
    dex: [
      'plushmog_plushie', 'plushmog_fortune_teller', 'plushmog_slot_royale',
      'verdikin_materia_bud', 'verdikin_materia_adept', 'verdikin_materia_master',
      'citrikin_mugger', 'citrikin_w_commander',
      'linkpom_link_guard', 'linkpom_counter_knight',
      'rubimog_summon_seed', 'rubimog_choco_caller', 'rubimog_round_herald',
      'amethymog_plus_adept',
      'execmog_intern', 'execmog_executive', 'execmog_president',
      'clodkin_arms_tester', 'clodkin_clod_pilot',
      'riotmog_shinra_mp', 'riotmog_hound_captain',
      'avamog_lookout', 'avamog_saboteur', 'avamog_reactor_raider',
      'slumkin_scavenger', 'slumkin_junk_baron',
      'glamkupo_backup_dancer', 'glamkupo_honey_star',
      'derbymog_jockey', 'derbymog_s_class_racer',
      'arenakupo_arena_rookie', 'arenakupo_square_champion',
      'bellboo_bellhop', 'bellboo_night_manager',
      'cosmopom_candle_keeper', 'cosmopom_star_scholar', 'cosmopom_planet_elder',
      'nibelpom_trail_guide', 'nibelpom_peak_guide',
      'rocketpom_launch_tech', 'rocketpom_test_pilot', 'rocketpom_rocketeer',
      'pagodamog_pagoda_pupil', 'pagodamog_floor_guardian', 'pagodamog_pagoda_lord',
      'junopom_parade_cadet', 'junopom_drum_major',
      'airkupo_deckhand', 'airkupo_helmsman',
      'banopom_orchard_hand', 'banopom_loveless_poet', 'banopom_crimson_wing',
      'wingmog_white_wing',
      'deepkupo_deep_cadet', 'deepkupo_restrictor', 'deepkupo_tsviet',
      'courikupo_courier', 'courikupo_road_rider',
      'kupokid_mog_kid', 'kupokid_emporium_clerk', 'kupokid_mog_merchant',
      'deckpom_card_novice', 'deckpom_card_duelist', 'deckpom_card_queen',
      'condorpom_fort_lookout', 'condorpom_condor_marshal',
      'gambitkin_gambiteer',
      'nibblemog_nut_nibbler', 'nibblemog_sky_mog',
      'datapom_field_researcher', 'datapom_battle_analyst',
    ],
  });
})();

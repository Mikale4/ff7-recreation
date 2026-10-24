// Kupomon expansion pack 'era9' (docs/KUPOMON_CONTENT.md): the moogles of FF XIV, as Cait Sith's robots took them up.
// The moogle tribe of the great wood and of the floating isles (Mogpendragon, Kupka Kupp, Mogwin, Mogmont, Mogzun,
// Mogmul, the treasure-trove moogle), the battle jobs from Paladin to Pictomancer, the crafters and gatherers, the
// golden game palace's lucky tickets, and the cities (desert gold, a pirate harbour, a holy city in the snow, an eastern
// port, a far-north city of scholars). Primals and beast tribes only as homage, in our own words.
(function () {
  const KP = FF7.kupomon;
  const J = (name, type, look) => ({ name, type, look });
  const B = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });

  KP.content('era9', {
    // ------------------------------------------------------------------ jobs: one per stage, the outfit growing grander
    jobs: {
      // Mogpendragon: the desert arena's Gladiator, sworn to the palace, then a Paladin
      e9_gladiator: J('Arena Gladiator', 'knight', { hat: 'lanistahelm', body: 'tabard', weapon: 'shortsword', shield: 'round', g1: '#c8a050', g2: '#8a5a30' }),
      e9_sultansworn: J('Sultansworn', 'knight', { hat: 'sallet', body: 'plate', weapon: 'sword', shield: 'kite', g1: '#e8dcc0', g2: '#c8a040', cape: '#c8a040' }),
      e9_paladin: J('Holy Paladin', 'knight', { hat: 'plumed', body: 'runeplate', weapon: 'holysword', shield: 'tower', g1: '#eceff6', g2: '#d8b040', cape: '#2a4aa0', glow: '#fff4c0' }),
      // Kupka Kupp: lancer of the floating isles, dragoon of the holy city, the dragon-eyed Azure Dragoon
      e9_lancer: J('Wood Lancer', 'dragoon', { hat: 'coif', body: 'vest', weapon: 'spear', g1: '#4a7a3a', g2: '#c8b080' }),
      e9_dragoon: J('Isle Dragoon', 'dragoon', { hat: 'dragoon', body: 'scale', weapon: 'lance', g1: '#2a3a6a', g2: '#9aa8c8' }),
      e9_azure_dragoon: J('Azure Dragoon', 'dragoon', { hat: 'dragonhelm', body: 'featherarmor', weapon: 'spear', g1: '#1a4ab0', g2: '#c8d8ff', cape: '#2a6ad8', extra: ['dragonwings'] }),
      // Mogwin: the great wood's Conjurer, its warden, then its Seedseer
      e9_conjurer: J('Conjurer', 'whitemage', { hat: 'hood', body: 'robe', weapon: 'oakstaff', g1: '#e8e0c8', g2: '#5a8a3a' }),
      e9_greenwarden: J('Greenwarden', 'whitemage', { hat: 'leafcrown', body: 'leafcloak', weapon: 'leafrod', g1: '#5a9a4a', g2: '#f0e8d0', extra: ['wisps'] }),
      e9_seedseer: J('Seedseer', 'whitemage', { hat: 'twigcrown', body: 'surplice', weapon: 'oakstaff', g1: '#f6f2e6', g2: '#c03838', cape: '#5a9a4a', extra: ['wisps', 'halo'] }),
      // Mogmont: archer of the wood, then a wandering Bard
      e9_archer: J('Wood Archer', 'ranger', { hat: 'greenhat', body: 'quiver', weapon: 'bow', g1: '#3a7a3a', g2: '#a07040' }),
      e9_bard: J('Wanderer Bard', 'bard', { hat: 'feathercap', body: 'doublet', weapon: 'longbow', g1: '#2a6a5a', g2: '#d8b040', cape: '#3a8a6a' }),
      // Mogzun (Mogroc, the rock): Miner, then a bomb-happy Blast Miner
      e9_ore_miner: J('Ore Miner', 'machinist', { hat: 'headlamp', body: 'overalls', weapon: 'pick', g1: '#6a5a48', g2: '#e0b030' }),
      e9_blast_miner: J('Blast Miner', 'machinist', { hat: 'safetyhelm', body: 'bandolier', weapon: 'mortar', g1: '#8a4a2a', g2: '#ffb030' }),
      // Mogmul: Botanist, then Carpenter
      e9_botanist: J('Botanist', 'beast', { hat: 'herbhat', body: 'apron', weapon: 'axe', g1: '#6a8a3a', g2: '#c8a870' }),
      e9_carpenter: J('Carpenter', 'freelancer', { hat: 'workcap', body: 'toolbelt', weapon: 'chisel', g1: '#8a6a3a', g2: '#4a7a5a' }),
      // the treasure-trove moogle
      e9_trove_keeper: J('Trove Keeper', 'freelancer', { hat: 'explorer', body: 'backpack', weapon: 'coinpurse', g1: '#c8a040', g2: '#7a3a8a' }),
      // Thaumog: Thaumaturge, Black Mage (fire and ice), the Astral Archon
      e9_thaumaturge: J('Thaumaturge', 'blackmage', { hat: 'cowl', body: 'robe', weapon: 'scepter', g1: '#5a2a2a', g2: '#d8b040', shadowFace: true, eyes: '#ffb040' }),
      e9_umbral_mage: J('Umbral Mage', 'blackmage', { hat: 'witch', body: 'mantle', weapon: 'orbstaff', g1: '#2a2a6a', g2: '#ff9030', shadowFace: true, eyes: '#ffd040' }),
      e9_astral_archon: J('Astral Archon', 'blackmage', { hat: 'archmage', body: 'emberrobe', weapon: 'elemstaff', g1: '#3a1a5a', g2: '#ff6030', cape: '#1a1030', shadowFace: true, eyes: '#ff8040', extra: ['wisps'] }),
      // Kupuncle: Arcanist with a little ruby beast, gem Summoner, the sun-dragon's Solar Summoner
      e9_arcanist: J('Arcane Pupil', 'summoner', { hat: 'pagecap', body: 'satchel', weapon: 'grimoire', g1: '#2a6a5a', g2: '#d8b040' }),
      e9_gem_summoner: J('Gem Summoner', 'summoner', { hat: 'runecirclet', body: 'magiccape', weapon: 'book', g1: '#1a5a6a', g2: '#ff4060', cape: '#1a5a6a' }),
      e9_solar_summoner: J('Solar Summoner', 'summoner', { hat: 'flamecrown', body: 'mantle', weapon: 'grimoire', g1: '#2a2a4a', g2: '#ffc040', cape: '#ff7030', extra: ['dragonpet'] }),
      // Pixipom: a student of the far-north city, then a Scholar with a faerie
      e9_pupil: J('Studium Pupil', 'redmage', { hat: 'mortarboard', body: 'doublet', weapon: 'book', g1: '#2a3a6a', g2: '#e8e0c0' }),
      e9_scholar: J('Faerie Scholar', 'redmage', { hat: 'quillcap', body: 'longcoat', weapon: 'grimoire', g1: '#2a2a5a', g2: '#f0d070', extra: ['fairy'] }),
      // Starkupo: cards, then the Astrologian's astrolabe, then the whole sky
      e9_card_reader: J('Card Reader', 'timemage', { hat: 'seer', body: 'robe', weapon: 'cards', g1: '#3a2a6a', g2: '#e8c040' }),
      e9_astrologian: J('Astrologian', 'timemage', { hat: 'skyseer', body: 'starcoat', weapon: 'astrolabe', g1: '#1a2a5a', g2: '#f0d060' }),
      e9_star_arbiter: J('Star Arbiter', 'timemage', { hat: 'observatory', body: 'gown', weapon: 'starglobe', g1: '#2a2a6a', g2: '#ffe080', cape: '#1a1a4a', extra: ['halo'] }),
      // Noulikin: a student Physician, then a Sage with floating nouliths
      e9_physician: J('Physician', 'whitemage', { hat: 'spectacles', body: 'coat', weapon: 'flask', g1: '#e8f0f0', g2: '#3a8a8a', liquid: '#60e0c0' }),
      e9_sage: J('Noulith Sage', 'whitemage', { hat: 'elemcirclet', body: 'robe', weapon: 'wand', g1: '#e8f4f8', g2: '#40b0d0', extra: ['wisps'] }),
      // Mudrakin: a harbour Rogue, an eastern Ninja, a master of the hand signs
      e9_rogue: J('Dock Rogue', 'thief', { hat: 'kerchief', body: 'harness', weapon: 'kunai', g1: '#3a3a4a', g2: '#a02828' }),
      e9_ninja: J('Doman Ninja', 'thief', { hat: 'halfmask', body: 'wraps', weapon: 'tanto', g1: '#2a2a3a', g2: '#c03030' }),
      e9_mudra_master: J('Mudra Master', 'thief', { hat: 'mask', body: 'catsuit', weapon: 'shuriken', g1: '#1a1a2a', g2: '#e03030', cape: '#2a1a2a' }),
      // Mogwolf: the harbour's Marauder, a Warrior, the sea-wolf chief
      e9_marauder: J('Marauder', 'warrior', { hat: 'bandana', body: 'stripes', weapon: 'axe', g1: '#2a3a5a', g2: '#c8c8d0' }),
      e9_axe_warrior: J('Axe Warrior', 'warrior', { hat: 'helm', body: 'furs', weapon: 'greataxe', g1: '#7a2a20', g2: '#9a9aa0' }),
      e9_sea_wolf: J('Sea Wolf Chief', 'warrior', { hat: 'wolfears', body: 'mane', weapon: 'greataxe', g1: '#3a3a48', g2: '#e04030', cape: '#1a3a6a' }),
      // Bulletpom: a cadet of the snowy empire, then a Gunbreaker
      e9_gun_cadet: J('Gun Cadet', 'knight', { hat: 'shako', body: 'trooper', weapon: 'gunblade', g1: '#3a3a4a', g2: '#a0a0b0' }),
      e9_gunbreaker: J('Galvus Breaker', 'knight', { hat: 'bascinet', body: 'longcoat', weapon: 'gunblade', g1: '#2a2a3a', g2: '#d0d4e0', cape: '#3a3a50' }),
      // Duskmog: sworn to the shadow, then a Dark Knight with its living shadow
      e9_shadowsworn: J('Shadowsworn', 'knight', { hat: 'darkhelm', body: 'cloak', weapon: 'darksword', g1: '#3a2a3a', g2: '#6a6a7a' }),
      e9_abyssal_knight: J('Abyssal Knight', 'knight', { hat: 'dkhorns', body: 'darkplate', weapon: 'greatsword', g1: '#1a1a22', g2: '#802030', cape: '#1a0a1a', eyes: '#ff3040', glow: '#a020ff', extra: ['wisps'] }),
      // Tsubamog: Ronin, then a Samurai of the eastern port
      e9_ronin: J('Ronin', 'warrior', { hat: 'kasa', body: 'scarf', weapon: 'bokken', g1: '#5a4a3a', g2: '#c8b890' }),
      e9_samurai: J('Kugane Samurai', 'warrior', { hat: 'chonmage', body: 'hakama', weapon: 'nodachi', g1: '#8a1a2a', g2: '#e8d8a0' }),
      // Reapom: a scythe novice, then a Reaper with a voidsent avatar
      e9_scythe_novice: J('Scythe Novice', 'beast', { hat: 'hood', body: 'cloak', weapon: 'scythe', g1: '#3a3a3a', g2: '#8a2a3a' }),
      e9_void_reaper: J('Void Reaper', 'beast', { hat: 'skullhood', body: 'shroud', weapon: 'scythe', g1: '#1a1a2a', g2: '#c02040', shadowFace: true, eyes: '#ff4060', extra: ['wisps'] }),
      // Fangmog: jungle fang novice, then a twin-bladed Viper
      e9_fang_novice: J('Fang Novice', 'thief', { hat: 'headwrap', body: 'wraps', weapon: 'dagger', g1: '#3a6a3a', g2: '#c8a050' }),
      e9_viper: J('Twinfang Viper', 'thief', { hat: 'wyvernhood', body: 'leather', weapon: 'scimitar', g1: '#1a4a2a', g2: '#e0c040' }),
      // Steelmog: Gunsmith, the holy city's sky-steel Machinist, then its automaton's partner
      e9_gunsmith: J('Gunsmith', 'machinist', { hat: 'welder', body: 'apron', weapon: 'pistol', g1: '#5a4a3a', g2: '#b0b0b8' }),
      e9_machinist: J('Skysteel Gunner', 'machinist', { hat: 'goggles', body: 'jacket', weapon: 'rifle', g1: '#3a4a6a', g2: '#d0a040' }),
      e9_automaton_ace: J('Automaton Ace', 'machinist', { hat: 'tekhelm', body: 'gadgetpack', weapon: 'tekcannon', g1: '#2a3a5a', g2: '#e8c040', extra: ['jetpack'] }),
      // Twirlmog: fans on the beach, then a Dancer of starlit steps
      e9_fan_twirler: J('Fan Twirler', 'bard', { hat: 'flowercrown', body: 'skirt', weapon: 'fans', g1: '#e070b0', g2: '#f0e080' }),
      e9_star_dancer: J('Star Dancer', 'bard', { hat: 'tiara', body: 'streamers', weapon: 'fans', g1: '#c03070', g2: '#f0d040', cape: '#ff90c0' }),
      // Vermog: a rapier student, then a Red Mage
      e9_rapierist: J('Rapierist', 'redmage', { hat: 'beret', body: 'fencingjacket', weapon: 'foil', g1: '#c02838', g2: '#f0f0f0' }),
      e9_vermilion_mage: J('Vermilion Mage', 'redmage', { hat: 'musketeer', body: 'duelcoat', weapon: 'rapier', g1: '#b01828', g2: '#e8e0d8', cape: '#801020', glow: '#ff6070' }),
      // Pictopom: a doodler, then a Pictomancer whose motifs come alive
      e9_doodler: J('Doodler', 'redmage', { hat: 'artberet', body: 'paintsmock', weapon: 'paintbrush', g1: '#4a80d0', g2: '#f0c040' }),
      e9_motif_painter: J('Motif Painter', 'redmage', { hat: 'pictohat', body: 'pictocoat', weapon: 'magicbrush', g1: '#3a3a8a', g2: '#ff70c0', extra: ['featherwings'] }),
      // Carnivamog: the masked arena's Blue Mage
      e9_carnival_blue: J('Carnival Blue', 'redmage', { hat: 'bluemask', body: 'tailcoat', weapon: 'wand', g1: '#1a3a9a', g2: '#e8c040', cape: '#2a5ad0' }),
      // Stitchpom: Leatherworker, Weaver, then the fashion judge
      e9_leatherworker: J('Leatherworker', 'beast', { hat: 'trapperhat', body: 'leather', weapon: 'needle', g1: '#8a5a30', g2: '#d8b080' }),
      e9_weaver: J('Weaver', 'bard', { hat: 'woolhood', body: 'smock', weapon: 'shears', g1: '#7a6aa0', g2: '#f0e8d8' }),
      e9_couturier: J('Couturier', 'bard', { hat: 'plume', body: 'gown', weapon: 'mirror', g1: '#c040a0', g2: '#f0e0c0', cape: '#6a2a8a' }),
      // Anvilmog: Blacksmith, then Armorer
      e9_blacksmith: J('Blacksmith', 'warrior', { hat: 'sweatband', body: 'apron', weapon: 'mace', g1: '#5a3a2a', g2: '#ff8030' }),
      e9_armorer: J('Armorer', 'knight', { hat: 'mailcoif', body: 'plate', weapon: 'mace', shield: 'tower', g1: '#7a7a88', g2: '#c86030' }),
      // Phialmog: the Alchemist's philters, then a Goldsmith
      e9_philterer: J('Philterer', 'blackmage', { hat: 'loupe', body: 'coat', weapon: 'flask', g1: '#4a2a6a', g2: '#c8a040', liquid: '#c040ff' }),
      e9_goldsmith: J('Goldsmith', 'machinist', { hat: 'monocle', body: 'waistcoat', weapon: 'magnifier', g1: '#d8b040', g2: '#5a3a2a' }),
      // Ladlemog: a harbour kitchen hand, then a Culinarian
      e9_kitchen_hand: J('Kitchen Hand', 'freelancer', { hat: 'toque', body: 'apron', weapon: 'ladle', g1: '#f0f0f0', g2: '#c03030' }),
      e9_culinarian: J('Culinarian', 'freelancer', { hat: 'tallchef', body: 'chefcoat', weapon: 'fryingpan', g1: '#f8f8f8', g2: '#2a4a8a' }),
      // Whiskmog: Fisher on the docks, the ferry's ocean fisher, a spearfisher
      e9_line_caster: J('Line Caster', 'ranger', { hat: 'straw', body: 'vest', weapon: 'fishrod', g1: '#4a6a8a', g2: '#d8c890' }),
      e9_ocean_fisher: J('Ocean Fisher', 'ranger', { hat: 'souwester', body: 'lifejacket', weapon: 'net', g1: '#e8c030', g2: '#2a4a6a' }),
      e9_spearfisher: J('Spearfisher', 'ranger', { hat: 'snorkel', body: 'divesuit', weapon: 'trident', g1: '#2a5a8a', g2: '#f0c030' }),
      // Chakrapom: a pit fighter, a Monk of the chakras, the fist of the mountain temples
      e9_fistfighter: J('Fistfighter', 'monk', { hat: 'band', body: 'tanktop', weapon: 'cestus', g1: '#c04a30', g2: '#f0e0c0' }),
      e9_chakra_monk: J('Chakra Monk', 'monk', { hat: 'lotus', body: 'monkrobe', weapon: 'handwraps', g1: '#d88a30', g2: '#7a2a2a' }),
      e9_rhalgr_fist: J('Fist of Rhalgr', 'monk', { hat: 'saintband', body: 'whitegi', weapon: 'gauntlet', g1: '#e8e0d0', g2: '#d04020', cape: '#e04020' }),
      // Cactpom: the golden game palace's lucky-ticket host
      e9_cactpot_host: J('Cactpot Host', 'thief', { hat: 'cactus', body: 'tuxedo', weapon: 'megaphone', g1: '#2a6a2a', g2: '#e8c030' }),
    },

    // ------------------------------------------------------------------ signature moves (the star moogles')
    moves: {
      e9_geirskogul: { name: 'Geirskogul', type: 'dragoon', power: 100, acc: 100, cd: 2, ignoreDefStages: true, flags: ['pulse'], sig: true, desc: "A beam from the dragon's eye that ignores the foe's Defense boosts." },
      e9_confiteor: { name: 'Confiteor', type: 'whitemage', power: 85, acc: 100, cd: 2, cat: 'physical', drain: 0.5, flags: ['contact', 'slice'], sig: true, desc: 'A blade of holy light: heals the user half the damage it deals.' },
      e9_mini_cactpot: { name: 'Mini Cactpot', type: 'thief', power: 25, acc: 100, cd: 1, hits: 3, crit: 1, sig: true, desc: 'Scratches three spots of a lucky ticket: hits 3 times, crits often.' },
      e9_astral_draw: { name: 'Astral Draw', type: 'timemage', power: 0, acc: true, cd: 2, self: { mag: 1, crit: 1 }, sig: true, desc: 'Draws a star card from its deck: Magic up, crits likelier.' },
    },

    // ------------------------------------------------------------------ signature abilities
    abilities: {
      e9_blood_of_dragon: { name: 'Blood of Dragon', desc: 'Dragoon moves hit 1.2x; it comes out with crits likelier.', boost: { types: ['dragoon'], mul: 1.2 }, onEnter: { self: ['crit', 1] } },
      e9_treasure_trove: { name: 'Treasure Trove', desc: "Shows the foe's held item; prize coins x2 and 1.2x EXP.", frisk: true, coins: 2, expMul: 1.2 },
      e9_fashion_report: { name: 'Fashion Report', desc: "Strikes a pose: the foe's Magic drops as it comes out; coins x2.", onEnter: { foe: ['mag', -1] }, coins: 2 },
    },

    // ------------------------------------------------------------------ species, line by line
    species: {
      // ---- Mogpendragon: Paladin line (knight wall), the desert arena
      mogpendragon_gladiator: { moogle: 'Mogpendragon', job: 'e9_gladiator', base: B(60, 55, 65, 30, 50, 35), rate: 160, exp: 62, curve: 'slow', fur: '#f2ece0', pom: '#3a6ad8',
        evo: { at: 18, to: 'mogpendragon_sultansworn' }, abilities: ['last_bastion', 'auto_wall', 'hold_fast'],
        desc: 'Trains in a sandy arena under the desert sun. It bows to the crowd before every fight, even when there is no crowd.',
        learn: '1 shield_bash, 1 pout, 4 slash, 7 rend_armor, 10 sheltron, 13 iron_wall, 16 shield_bash, 22 challenge, 26 slash',
        habitat: 'desert', rarity: 'uncommon', class: 'normal' },
      mogpendragon_sultansworn: { moogle: 'Mogpendragon', job: 'e9_sultansworn', base: B(80, 72, 88, 42, 68, 45), rate: 80, exp: 145, curve: 'slow', fur: '#f2ece0', pom: '#3a6ad8',
        evo: { at: 34, to: 'mogpendragon_paladin' }, abilities: ['last_bastion', 'auto_wall', 'hold_fast'],
        desc: 'Swore to guard a royal palace. It takes the oath so seriously that it salutes the palace cat.',
        learn: '18 valiant, 21 challenge, 24 aegis_slam, 26 slash, 29 holy_mace, 32 shield_wall, 38 shield_bash, 42 cleansing_strike',
        habitat: 'desert', rarity: 'uncommon', class: 'normal' },
      mogpendragon_paladin: { moogle: 'Mogpendragon', job: 'e9_paladin', type2: 'whitemage', base: B(100, 92, 112, 66, 92, 50), rate: 45, exp: 240, curve: 'slow', fur: '#f2ece0', pom: '#3a6ad8',
        abilities: ['last_bastion', 'auto_wall', 'hold_fast'],
        desc: 'A holy shield and a sword that shines. Its name is much longer than it is, so its friends just call it Pen.',
        learn: '34 spirits_within, 37 shield_bash, 40 e9_confiteor, 43 saint_cross, 46 sentinel',
        habitat: 'desert', rarity: 'uncommon', class: 'normal' },

      // ---- Kupka Kupp: Dragoon line, the pseudo-legendary of the floating isles
      kupkakupp_lancer: { moogle: 'Kupka Kupp', job: 'e9_lancer', base: B(52, 64, 48, 36, 42, 58), rate: 45, exp: 65, curve: 'slow', fur: '#eef2fa', pom: '#3a8ae0', wing: '#4a6ab0',
        evo: { at: 30, to: 'kupkakupp_dragoon' }, abilities: ['dragon_spirit', 'pom_wings', 'wyvern_wings'],
        desc: 'Born on the floating isles of the moogle tribe. It practises spear jabs on the clouds, and the clouds are winning.',
        learn: '1 thrust, 1 pout, 5 pom_lance, 9 leg_sweep, 13 wyrm_dance, 17 lancet, 20 thrust, 24 soul_jump, 27 spear_wall, 34 harpoon, 38 pom_lance',
        habitat: 'sky', rarity: 'rare', class: 'pseudo' },
      kupkakupp_dragoon: { moogle: 'Kupka Kupp', job: 'e9_dragoon', base: B(70, 92, 66, 48, 60, 89), rate: 45, exp: 150, curve: 'slow', fur: '#eef2fa', pom: '#3a8ae0', wing: '#4a6ab0',
        evo: { at: 45, to: 'kupkakupp_azure_dragoon' }, abilities: ['dragon_spirit', 'pom_wings', 'wyvern_wings'],
        desc: 'Jumps from isle to isle without looking down. Looking down is how the last one ended up in a haystack.',
        learn: '30 jump, 32 pom_lance, 35 cross_slash, 38 dragon_fang, 41 high_jump, 44 thrust, 48 draconian_fury',
        habitat: 'sky', rarity: 'rare', class: 'pseudo' },
      kupkakupp_azure_dragoon: { moogle: 'Kupka Kupp', job: 'e9_azure_dragoon', type2: 'summoner', base: B(96, 134, 92, 70, 86, 122), rate: 45, exp: 260, curve: 'slow', fur: '#eef2fa', pom: '#3a8ae0', wing: '#4a6ab0',
        abilities: ['e9_blood_of_dragon', 'pom_wings', 'wyvern_wings'],
        desc: "A dragon's eye glows in its helm. It leaps so high the whole tribe packs a picnic to wait for it to land.",
        learn: '45 e9_geirskogul, 46 wyrm_dance, 48 stardiver',
        habitat: 'sky', rarity: 'rare', class: 'pseudo' },

      // ---- Mogwin: White Mage line of the great wood
      mogwin_conjurer: { moogle: 'Mogwin', job: 'e9_conjurer', base: B(55, 30, 40, 62, 58, 50), rate: 180, exp: 60, curve: 'medium', fur: '#f2f4e8', pom: '#7ac850', wing: '#5a9a4a',
        evo: { at: 16, to: 'mogwin_greenwarden' }, abilities: ['devotion', 'healing_pom', 'mistbringer'],
        desc: 'Listens to the trees of a great old wood. Mostly the trees ask it to stop poking them with its staff.',
        learn: '1 aero, 1 pout, 4 cure, 7 banish, 10 flash, 13 leaf_gust, 19 dia, 23 aero',
        habitat: 'forest', rarity: 'common', class: 'normal' },
      mogwin_greenwarden: { moogle: 'Mogwin', job: 'e9_greenwarden', type2: 'summoner', base: B(72, 40, 55, 85, 80, 66), rate: 90, exp: 142, curve: 'medium', fur: '#f2f4e8', pom: '#7ac850', wing: '#5a9a4a',
        evo: { at: 32, to: 'mogwin_seedseer' }, abilities: ['devotion', 'healing_pom', 'mistbringer'],
        desc: 'Tiny forest spirits ride on its pom-pom. It heals any moogle that trips, and plenty that only nearly tripped.',
        learn: '16 regen_spell, 19 dia, 22 holy_glare, 25 pollen_haze, 27 aerial_blast, 29 aero, 35 esuna, 38 aerora',
        habitat: 'forest', rarity: 'common', class: 'normal' },
      mogwin_seedseer: { moogle: 'Mogwin', job: 'e9_seedseer', type2: 'summoner', base: B(92, 50, 68, 110, 105, 80), rate: 45, exp: 236, curve: 'medium', fur: '#f2f4e8', pom: '#7ac850', wing: '#5a9a4a',
        abilities: ['devotion', 'healing_pom', 'mistbringer'],
        desc: 'Speaks for the whole forest at moogle councils. The speeches run long, because the forest has a lot to say.',
        learn: '32 sylph_breeze, 35 banishga, 38 holy_glare, 41 earthen_fury, 44 temperance, 47 holy',
        habitat: 'forest', rarity: 'common', class: 'normal' },

      // ---- Mogmont: Archer to Bard
      mogmont_archer: { moogle: 'Mogmont', job: 'e9_archer', base: B(50, 62, 45, 48, 45, 68), rate: 170, exp: 62, curve: 'fast', fur: '#f0ecdc', pom: '#4aa060',
        evo: { at: 24, to: 'mogmont_bard' }, abilities: ['raging_strikes', 'hawkeye'],
        desc: 'Shoots from the treetops of a leafy city. It never misses an apple, and it never shares one either.',
        learn: '1 arrow, 1 aim, 4 snap_shot, 8 twin_arrow, 12 hunters_mark, 16 sidewinder, 18 arrow, 21 flaming_arrow, 28 buckshot, 32 barrage',
        habitat: 'grass', rarity: 'common', class: 'normal' },
      mogmont_bard: { moogle: 'Mogmont', job: 'e9_bard', type2: 'ranger', base: B(72, 92, 62, 75, 68, 103), rate: 75, exp: 212, curve: 'fast', fur: '#f0ecdc', pom: '#4aa060',
        abilities: ['raging_strikes', 'hawkeye'],
        desc: "Plays a song with every arrow it looses. Its foes can't decide whether to dodge or to clap.",
        learn: '24 sonic_chord, 27 wardens_paean, 30 shadowbind, 33 battle_song, 36 arrow, 39 wind_song, 42 buckshot, 45 requiem, 48 apex_arrow',
        habitat: 'grass', rarity: 'common', class: 'normal' },

      // ---- Mogzun: Miner to Blast Miner
      mogzun_miner: { moogle: 'Mogzun', job: 'e9_ore_miner', base: B(62, 68, 62, 30, 40, 38), rate: 170, exp: 62, curve: 'medium', fur: '#e4dccc', pom: '#ff8a30',
        evo: { at: 22, to: 'mogzun_blast_miner' }, abilities: ['night_vision', 'hold_fast', 'bomb_body'],
        desc: 'Digs in hot mines beside a gang of burly beastfolk. They taught it two things: tunnels, and bombs.',
        learn: '1 pickaxe, 1 pout, 4 rivet_gun, 7 quicksand, 10 scattergun, 13 pickaxe, 16 mine_layer, 19 drill, 25 gaia_rage, 29 pickaxe',
        habitat: 'cave', rarity: 'common', class: 'normal' },
      mogzun_blast_miner: { moogle: 'Mogzun', job: 'e9_blast_miner', type2: 'beast', base: B(90, 108, 95, 48, 62, 52), rate: 70, exp: 214, curve: 'medium', fur: '#e4dccc', pom: '#ff8a30',
        abilities: ['night_vision', 'hold_fast', 'bomb_body'],
        desc: 'Opens a new tunnel every morning with one small bomb. The bomb is never as small as it says on the box.',
        learn: '22 gaia_rage, 24 wrench, 27 wildfire_oil, 30 gyro_grinder, 33 dust_devil, 36 rivet_gun, 39 earth_render, 42 cave_in, 45 pickaxe, 48 gaia_rage',
        habitat: 'cave', rarity: 'common', class: 'normal' },

      // ---- Mogmul: Botanist to Carpenter
      mogmul_botanist: { moogle: 'Mogmul', job: 'e9_botanist', base: B(60, 60, 55, 45, 55, 45), rate: 180, exp: 60, curve: 'fast', fur: '#e8eedc', pom: '#a0d060',
        evo: { at: 20, to: 'mogmul_carpenter' }, abilities: ['auto_regen', 'finesse'],
        desc: 'Gathers herbs with the little sprites of the wood. It once lost a whole afternoon chatting to a mushroom.',
        learn: '1 acorn, 1 roar, 4 hedge_clip, 8 tanglevine, 12 spore, 15 thorn_whip, 18 acorn, 24 wellspring, 28 topiary',
        habitat: 'forest', rarity: 'common', class: 'normal' },
      mogmul_carpenter: { moogle: 'Mogmul', job: 'e9_carpenter', type2: 'beast', base: B(85, 95, 85, 55, 75, 70), rate: 75, exp: 208, curve: 'fast', fur: '#e8eedc', pom: '#a0d060',
        abilities: ['auto_regen', 'finesse'],
        desc: 'Builds whole houses from wood it chopped itself. Every door is moogle-sized, so its guests have to crawl.',
        learn: '20 pom_flurry, 23 accumulate, 26 trailblaze, 29 hedge_clip, 32 kupo_toss, 35 topiary, 38 wellspring, 41 pom_flurry, 44 mog_rush, 47 stampede',
        habitat: 'forest', rarity: 'common', class: 'normal' },

      // ---- Mogtrove: the treasure-trove moogle (one stage)
      mogtrove_trove_keeper: { moogle: 'Mogtrove', job: 'e9_trove_keeper', type2: 'thief', base: B(75, 88, 65, 60, 65, 112), rate: 45, exp: 190, curve: 'slow', fur: '#f6efdc', pom: '#ffcc30', wing: '#c89a30',
        abilities: ['e9_treasure_trove', 'kupo_luck'],
        desc: 'Swaps prizes for odd tokens nobody else wants. Its pack holds a saddle, a hat and one very old sandwich.',
        learn: '1 steal, 1 pout, 5 pom_bop, 9 thievery, 13 sleight_of_hand, 17 pilfer, 21 gil_toss, 25 trick_attack, 29 steal, 33 coup_de_grace, 37 mognet_relay, 41 pom_flurry, 44 grand_heist, 48 jackpot',
        habitat: 'ruins', rarity: 'rare', class: 'normal' },

      // ---- Thaumog: Thaumaturge, Black Mage, Astral Archon
      thaumog_thaumaturge: { moogle: 'Thaumog', job: 'e9_thaumaturge', base: B(45, 30, 38, 72, 55, 60), rate: 150, exp: 62, curve: 'medium', fur: '#ece4dc', pom: '#ff5a20',
        evo: { at: 16, to: 'thaumog_umbral_mage' }, abilities: ['mana_surge', 'echo_voice', 'mana_tempest'],
        desc: 'Studies fire magic in a city of gold and sand. Its scepter always smells faintly of toast.',
        learn: '1 fire, 1 blizzard, 4 sleep_spell, 7 thunder, 10 scathe, 13 blizzara, 19 fira, 22 fire',
        habitat: 'volcano', rarity: 'uncommon', class: 'normal' },
      thaumog_umbral_mage: { moogle: 'Thaumog', job: 'e9_umbral_mage', base: B(60, 40, 50, 100, 72, 83), rate: 85, exp: 144, curve: 'medium', fur: '#ece4dc', pom: '#ff5a20',
        evo: { at: 34, to: 'thaumog_astral_archon' }, abilities: ['mana_surge', 'echo_voice', 'mana_tempest'],
        desc: 'Swaps between fire and ice in a single breath. It has never once had a lukewarm cup of tea.',
        learn: '16 astral_fire, 19 fira, 22 fire, 25 sharpcast, 28 triplecast, 30 blizzard, 36 firaga, 40 flare',
        habitat: 'volcano', rarity: 'uncommon', class: 'normal' },
      thaumog_astral_archon: { moogle: 'Thaumog', job: 'e9_astral_archon', type2: 'timemage', base: B(75, 50, 62, 135, 90, 103), rate: 45, exp: 238, curve: 'medium', fur: '#ece4dc', pom: '#ff5a20',
        abilities: ['mana_surge', 'echo_voice', 'mana_tempest'],
        desc: 'Burns so hot, then so cold, that time bends around it. Its hat has a scorch mark and a frost mark, side by side.',
        learn: '34 ley_lines, 37 comet, 40 scathe, 43 celerity, 46 flare',
        habitat: 'volcano', rarity: 'uncommon', class: 'normal' },

      // ---- Kupuncle: Arcanist, gem Summoner, Solar Summoner (a little ruby beast in tow)
      kupuncle_arcanist: { moogle: 'Kupuncle', job: 'e9_arcanist', base: B(52, 35, 50, 65, 55, 48), rate: 150, exp: 62, curve: 'medium', fur: '#eef0f6', pom: '#30c0a0', nose: '#e03050',
        evo: { at: 18, to: 'kupuncle_gem_summoner' }, abilities: ['dreadwyrm_trance', 'summon_bond', 'auto_reflect'],
        desc: 'Reads magic straight out of a book. A little ruby beast followed it home and insists it was always there.',
        learn: '1 ruin, 1 ruby_light, 4 haunt, 8 searing_light, 11 miasma, 14 ruin, 17 delta_attack, 22 hellfire, 26 haunt',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal' },
      kupuncle_gem_summoner: { moogle: 'Kupuncle', job: 'e9_gem_summoner', base: B(70, 45, 65, 90, 75, 63), rate: 85, exp: 144, curve: 'medium', fur: '#eef0f6', pom: '#30c0a0', nose: '#e03050',
        evo: { at: 36, to: 'kupuncle_solar_summoner' }, abilities: ['dreadwyrm_trance', 'summon_bond', 'auto_reflect'],
        desc: 'Calls little spirits of fire, wind and rock out of its gems. It keeps the receipts in case they need to go back.',
        learn: '18 hellfire, 21 aerial_blast, 24 dread_shade, 27 earthen_fury, 30 earth_wall, 33 haunt, 40 judgment_bolt, 44 ruin',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal' },
      kupuncle_solar_summoner: { moogle: 'Kupuncle', job: 'e9_solar_summoner', type2: 'redmage', base: B(88, 55, 80, 122, 95, 80), rate: 45, exp: 238, curve: 'medium', fur: '#eef0f6', pom: '#30c0a0', nose: '#e03050',
        abilities: ['dreadwyrm_trance', 'summon_bond', 'auto_reflect'],
        desc: 'Calls a tiny sun-dragon to its side. The dragon is tiny; the attitude is not.',
        learn: '36 mist_dragon, 39 dualcast, 42 ruin, 45 teraflare, 48 earthen_fury',
        habitat: 'ruins', rarity: 'uncommon', class: 'normal' },

      // ---- Pixipom: student to Scholar (a faerie on its shoulder)
      pixipom_pupil: { moogle: 'Pixipom', job: 'e9_pupil', base: B(55, 35, 50, 65, 60, 55), rate: 170, exp: 62, curve: 'medium', fur: '#f4f0f8', pom: '#ff90d0', wing: '#c8a0e0',
        evo: { at: 25, to: 'pixipom_scholar' }, abilities: ['pom_prank', 'medicine'],
        desc: 'Studies in a city of scholars far to the north. It takes notes on its notes, then naps on them.',
        learn: '1 ruin, 1 pout, 4 miasma, 7 aero, 11 regen_spell, 14 mind_blast, 17 ruin, 21 magick_barrier, 28 broil, 32 ruin',
        habitat: 'grass', rarity: 'common', class: 'normal' },
      pixipom_scholar: { moogle: 'Pixipom', job: 'e9_scholar', type2: 'whitemage', base: B(80, 45, 70, 95, 95, 85), rate: 75, exp: 212, curve: 'medium', fur: '#f4f0f8', pom: '#ff90d0', wing: '#c8a0e0',
        abilities: ['pom_prank', 'medicine'],
        desc: 'A faerie from a land of pranksters advises it in battle. Most of the advice is about snacks.',
        learn: '25 adloquium, 28 pearl_volley, 31 broil, 34 pom_dust, 37 resolution_spell, 40 pearl_volley, 43 holy, 46 regen_spell',
        habitat: 'grass', rarity: 'common', class: 'normal' },

      // ---- Starkupo: Card Reader, Astrologian, Star Arbiter
      starkupo_card_reader: { moogle: 'Starkupo', job: 'e9_card_reader', base: B(48, 30, 42, 68, 55, 62), rate: 150, exp: 60, curve: 'medium', fur: '#eae8f6', pom: '#f0d060',
        evo: { at: 17, to: 'starkupo_astrologian' }, abilities: ['kupo_luck', 'quickcast'],
        desc: 'Draws a card each morning to plan its day. It has drawn The Nap every single day this week.',
        learn: '1 starlight, 1 slow, 4 starshower, 7 gravity, 10 haste, 13 premonition, 16 starlight, 20 comet, 24 tick_tock',
        habitat: 'night', rarity: 'uncommon', class: 'normal' },
      starkupo_astrologian: { moogle: 'Starkupo', job: 'e9_astrologian', type2: 'whitemage', base: B(65, 40, 58, 92, 72, 83), rate: 85, exp: 142, curve: 'medium', fur: '#eae8f6', pom: '#f0d060',
        evo: { at: 33, to: 'starkupo_star_arbiter' }, abilities: ['kupo_luck', 'quickcast'],
        desc: 'Reads the stars in a cold holy city to help its friends. The stars say to nap more. It ignores the stars.',
        learn: '17 e9_astral_draw, 20 cure, 23 holy_glare, 26 comet, 29 regen_spell, 31 starshower, 36 moonbeam, 40 tick_tock',
        habitat: 'night', rarity: 'uncommon', class: 'normal' },
      starkupo_star_arbiter: { moogle: 'Starkupo', job: 'e9_star_arbiter', type2: 'whitemage', base: B(80, 50, 70, 120, 92, 103), rate: 45, exp: 236, curve: 'medium', fur: '#eae8f6', pom: '#f0d060',
        abilities: ['kupo_luck', 'quickcast'],
        desc: 'Shuffles the constellations like cards on a table. When it wins, it thanks a star by name.',
        learn: '33 starfall, 36 holy_glare, 39 chronosphere, 42 e9_astral_draw, 45 meteor',
        habitat: 'night', rarity: 'uncommon', class: 'normal' },

      // ---- Noulikin: Physician to Sage
      noulikin_physician: { moogle: 'Noulikin', job: 'e9_physician', base: B(55, 40, 45, 68, 60, 62), rate: 150, exp: 62, curve: 'medium', fur: '#eef6f6', pom: '#40c0d0',
        evo: { at: 26, to: 'noulikin_sage' }, abilities: ['field_medic', 'gun_mastery'],
        desc: 'A student doctor from a school in the far north. It checks your pulse, then its own, to be fair.',
        learn: '1 holy_glare, 1 cure, 4 pearl_volley, 8 dia, 12 esuna, 15 aspir, 18 holy_glare, 22 regen_spell, 30 banishga',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal' },
      noulikin_sage: { moogle: 'Noulikin', job: 'e9_sage', type2: 'machinist', base: B(80, 55, 62, 105, 85, 98), rate: 65, exp: 216, curve: 'medium', fur: '#eef6f6', pom: '#40c0d0',
        abilities: ['field_medic', 'gun_mastery'],
        desc: 'Floating blades circle it, mending friends and pricking foes. It insists they are strictly for science.',
        learn: '26 tracer_beam, 29 shrink_ray, 32 temperance, 35 banishga, 38 tracer_beam, 41 arc_relay, 44 holy_ray, 47 cure',
        habitat: 'lifestream', rarity: 'uncommon', class: 'normal' },

      // ---- Mudrakin: Rogue, Ninja, Mudra Master
      mudrakin_rogue: { moogle: 'Mudrakin', job: 'e9_rogue', base: B(45, 62, 40, 45, 40, 72), rate: 150, exp: 60, curve: 'medium', fur: '#e8e6e0', pom: '#c02830',
        evo: { at: 16, to: 'mudrakin_ninja' }, abilities: ['desperado', 'sneak_attack'],
        desc: 'Learned its trade in tunnels under a pirate city. It steals your nut and leaves a slightly nicer nut behind.',
        learn: '1 kunai, 1 trip, 4 quickhit, 7 makibishi, 10 katon, 13 kunai, 19 trick_attack, 23 shuriken',
        habitat: 'cave', rarity: 'uncommon', class: 'normal' },
      mudrakin_ninja: { moogle: 'Mudrakin', job: 'e9_ninja', type2: 'blackmage', base: B(58, 85, 52, 62, 52, 100), rate: 85, exp: 142, curve: 'medium', fur: '#e8e6e0', pom: '#c02830',
        evo: { at: 32, to: 'mudrakin_mudra_master' }, abilities: ['desperado', 'sneak_attack'],
        desc: 'Makes hand signs faster than you can blink. Once it signed a rude word by accident and set a tree on fire.',
        learn: '16 thunder, 19 trick_attack, 22 huton, 25 mug, 28 bunshin, 31 blizzara, 36 shuriken, 40 kunai',
        habitat: 'cave', rarity: 'uncommon', class: 'normal' },
      mudrakin_mudra_master: { moogle: 'Mudrakin', job: 'e9_mudra_master', type2: 'blackmage', base: B(70, 112, 62, 80, 62, 129), rate: 45, exp: 236, curve: 'medium', fur: '#e8e6e0', pom: '#c02830',
        abilities: ['desperado', 'sneak_attack'],
        desc: "Fire, thunder and ice wait in its hand signs. Now and then it still signs 'rabbit' by mistake.",
        learn: '32 quake_spell, 35 quickhit, 38 thundara, 41 trick_attack, 44 kunai, 47 throw',
        habitat: 'cave', rarity: 'uncommon', class: 'normal' },

      // ---- Mogwolf: Marauder, Warrior, Sea Wolf Chief
      mogwolf_marauder: { moogle: 'Mogwolf', job: 'e9_marauder', base: B(65, 70, 50, 25, 38, 45), rate: 180, exp: 60, curve: 'medium', fur: '#ece4d8', pom: '#2a5ab0',
        evo: { at: 18, to: 'mogwolf_warrior' }, abilities: ['last_stand', 'sleepless_fury'],
        desc: 'Swings an axe on the decks of a pirate city. Its sea legs are fine; its land legs are a little wobbly.',
        learn: '1 axe_chop, 1 warcry, 4 tomahawk, 8 maim, 11 bravery, 14 inner_beast, 17 axe_chop, 22 full_break, 26 tomahawk',
        habitat: 'sea', rarity: 'common', class: 'normal' },
      mogwolf_warrior: { moogle: 'Mogwolf', job: 'e9_axe_warrior', base: B(88, 98, 68, 32, 52, 62), rate: 90, exp: 142, curve: 'medium', fur: '#ece4d8', pom: '#2a5ab0',
        evo: { at: 35, to: 'mogwolf_sea_wolf' }, abilities: ['last_stand', 'sleepless_fury'],
        desc: 'Roars, swings, then roars again. Every seagull on the pier leaves the moment it starts to warm up.',
        learn: '18 vengeance, 21 full_break, 24 holmgang, 27 tomahawk, 30 anchor_drop, 33 inner_release, 38 fell_cleave',
        habitat: 'sea', rarity: 'common', class: 'normal' },
      mogwolf_sea_wolf: { moogle: 'Mogwolf', job: 'e9_sea_wolf', type2: 'beast', base: B(115, 130, 85, 40, 65, 75), rate: 45, exp: 238, curve: 'medium', fur: '#ece4d8', pom: '#2a5ab0',
        abilities: ['last_stand', 'sleepless_fury'],
        desc: 'Leads a crew of salty moogles. The beast inside it only wakes up when someone takes the last fish.',
        learn: '35 bite, 38 inner_release, 41 horn_ram, 44 axe_chop, 47 fell_cleave',
        habitat: 'sea', rarity: 'common', class: 'normal' },

      // ---- Bulletpom: Gun Cadet to Gunbreaker
      bulletpom_cadet: { moogle: 'Bulletpom', job: 'e9_gun_cadet', base: B(58, 65, 62, 35, 45, 55), rate: 150, exp: 62, curve: 'medium', fur: '#e8e8ee', pom: '#ff8030',
        evo: { at: 24, to: 'bulletpom_gunbreaker' }, abilities: ['stand_firm', 'adamant_shell'],
        desc: 'Polishes a sword with a trigger on it. It is still not quite sure which end to hold.',
        learn: '1 keen_edge, 1 warcry, 4 rivet_gun, 8 rend_armor, 12 big_shot, 15 sheltron, 18 keen_edge, 21 rend_weapon, 28 burst_strike',
        habitat: 'snow', rarity: 'uncommon', class: 'normal' },
      bulletpom_gunbreaker: { moogle: 'Bulletpom', job: 'e9_gunbreaker', type2: 'machinist', base: B(85, 102, 92, 45, 68, 78), rate: 65, exp: 214, curve: 'medium', fur: '#e8e8ee', pom: '#ff8030',
        abilities: ['stand_firm', 'adamant_shell'],
        desc: 'Loads a cartridge into its blade and swings. The bang makes it jump every single time.',
        learn: '24 burst_strike, 27 holmgang, 30 rivet_gun, 33 piston_punch, 36 rend_weapon, 39 keen_edge, 42 bravery, 45 lion_heart, 48 burst_strike',
        habitat: 'snow', rarity: 'uncommon', class: 'normal' },

      // ---- Duskmog: Shadowsworn to Dark Knight
      duskmog_shadowsworn: { moogle: 'Duskmog', job: 'e9_shadowsworn', base: B(60, 66, 56, 48, 45, 45), rate: 150, exp: 62, curve: 'medium', fur: '#dcd6e0', pom: '#8a1a3a', wing: '#3a1a2a',
        evo: { at: 26, to: 'duskmog_dark_knight' }, abilities: ['vampirism', 'shadowbringer'],
        desc: 'Swore to guard the weak in a cold holy city. Its own shadow joined the oath without asking.',
        learn: '1 shield_bash, 1 warcry, 4 haunt, 8 rend_armor, 12 karma_knife, 15 blood_price, 18 shield_bash, 22 sanguine_sword, 30 souleater, 34 haunt',
        habitat: 'night', rarity: 'uncommon', class: 'normal' },
      duskmog_dark_knight: { moogle: 'Duskmog', job: 'e9_abyssal_knight', type2: 'summoner', base: B(90, 108, 82, 65, 65, 65), rate: 60, exp: 216, curve: 'medium', fur: '#dcd6e0', pom: '#8a1a3a', wing: '#3a1a2a',
        abilities: ['vampirism', 'shadowbringer'],
        desc: "Its shadow fights beside it, a bit taller and much ruder. Neither will admit which one is in charge.",
        learn: '26 souleater, 29 nightfall, 32 haunt, 35 voodoo_doll, 38 karma_knife, 41 shield_bash, 44 living_dead, 47 darkside',
        habitat: 'night', rarity: 'uncommon', class: 'normal' },

      // ---- Tsubamog: Ronin to Samurai
      tsubamog_ronin: { moogle: 'Tsubamog', job: 'e9_ronin', base: B(50, 72, 45, 40, 45, 68), rate: 150, exp: 62, curve: 'medium', fur: '#f4eee4', pom: '#e03040',
        evo: { at: 25, to: 'tsubamog_samurai' }, abilities: ['iaijutsu', 'lucky_star'],
        desc: 'Wanders an eastern port town with a wooden blade. It bows to every lantern it passes, just in case.',
        learn: '1 bokken, 1 warcry, 4 slash, 7 crescent, 11 mighty_strikes, 14 retort, 17 bokken, 21 iai, 29 crescent',
        habitat: 'town', rarity: 'uncommon', class: 'normal' },
      tsubamog_samurai: { moogle: 'Tsubamog', job: 'e9_samurai', type2: 'timemage', base: B(72, 118, 65, 55, 62, 103), rate: 60, exp: 218, curve: 'medium', fur: '#f4eee4', pom: '#e03040',
        abilities: ['iaijutsu', 'lucky_star'],
        desc: 'Draws, cuts and sheathes before the falling petals land. Then it cuts the petals again, for style.',
        learn: '25 quick_spell, 28 slash, 31 blade_beam, 34 bravery, 37 iai, 40 bokken, 43 quick_spell, 46 zantetsu',
        habitat: 'town', rarity: 'uncommon', class: 'normal' },

      // ---- Reapom: Scythe Novice to Reaper
      reapom_novice: { moogle: 'Reapom', job: 'e9_scythe_novice', base: B(55, 70, 45, 45, 45, 60), rate: 150, exp: 62, curve: 'medium', fur: '#e0dce4', pom: '#a020c0',
        evo: { at: 27, to: 'reapom_reaper' }, abilities: ['apex_predator', 'primal_fury'],
        desc: 'Swings a scythe much taller than itself. Mostly it trims hedges, then says sorry to them.',
        learn: '1 hedge_clip, 1 roar, 4 haunt, 8 blood_suck, 12 seance, 15 reap, 18 hedge_clip, 22 karma_knife, 31 ectoplasm, 35 haunt',
        habitat: 'crater', rarity: 'uncommon', class: 'normal' },
      reapom_reaper: { moogle: 'Reapom', job: 'e9_void_reaper', type2: 'summoner', base: B(78, 112, 65, 70, 65, 90), rate: 60, exp: 218, curve: 'medium', fur: '#e0dce4', pom: '#a020c0',
        abilities: ['apex_predator', 'primal_fury'],
        desc: "A spirit from the void rides on its back and whispers advice. The advice is always 'more scythe.'",
        learn: '27 phantom_fade, 30 haunt, 33 grave_breath, 36 reap, 39 seance, 42 hedge_clip, 45 feral_frenzy, 48 karma_knife',
        habitat: 'crater', rarity: 'uncommon', class: 'normal' },

      // ---- Fangmog: Fang Novice to Viper
      fangmog_novice: { moogle: 'Fangmog', job: 'e9_fang_novice', base: B(48, 66, 42, 35, 42, 77), rate: 170, exp: 60, curve: 'medium', fur: '#e8eedc', pom: '#40a050',
        evo: { at: 22, to: 'fangmog_viper' }, abilities: ['scorpion_tail', 'speed_plus'],
        desc: 'Hunts in steamy jungles with a pair of curved knives. It hisses at strangers, then offers them tea.',
        learn: '1 cloak_dagger, 1 trip, 4 sting, 8 viper_fang, 11 venom_tacks, 14 prowl, 17 cloak_dagger, 20 nimble_pounce, 26 coup_de_grace',
        habitat: 'swamp', rarity: 'common', class: 'normal' },
      fangmog_viper: { moogle: 'Fangmog', job: 'e9_viper', type2: 'beast', base: B(68, 108, 60, 45, 60, 124), rate: 70, exp: 212, curve: 'medium', fur: '#e8eedc', pom: '#40a050',
        abilities: ['scorpion_tail', 'speed_plus'],
        desc: 'Two blades, one tail, no patience. It coils up before each strike, and nobody likes the sound it makes.',
        learn: '22 wildcat_swipes, 25 naga_fang, 28 coup_de_grace, 31 venom_mantle, 34 cloak_dagger, 37 underhand, 40 viper_fang, 43 wildcat_swipes, 46 feral_frenzy',
        habitat: 'swamp', rarity: 'common', class: 'normal' },

      // ---- Steelmog: Gunsmith, Machinist, Automaton Ace
      steelmog_gunsmith: { moogle: 'Steelmog', job: 'e9_gunsmith', base: B(50, 64, 50, 42, 45, 54), rate: 150, exp: 60, curve: 'medium', fur: '#e6e6ea', pom: '#e0b030',
        evo: { at: 17, to: 'steelmog_machinist' }, abilities: ['overheat', 'marksman', 'rapid_fire'],
        desc: 'Builds little guns in a workshop in the snow. Most of them fire. A few of them fire backwards.',
        learn: '1 rivet_gun, 1 aim, 4 wrench, 7 big_shot, 10 scattergun, 13 tracer_beam, 16 auto_crossbow, 20 drill, 24 rivet_gun',
        habitat: 'factory', rarity: 'uncommon', class: 'normal' },
      steelmog_machinist: { moogle: 'Steelmog', job: 'e9_machinist', type2: 'ranger', base: B(66, 88, 64, 55, 60, 75), rate: 85, exp: 142, curve: 'medium', fur: '#e6e6ea', pom: '#e0b030',
        evo: { at: 34, to: 'steelmog_ace' }, abilities: ['overheat', 'marksman', 'rapid_fire'],
        desc: 'Fires a gun, a drill and a saw before breakfast. The neighbours have given up complaining.',
        learn: '17 snap_shot, 20 drill, 23 wildfire_oil, 26 eagle_eye, 29 buckshot, 32 air_anchor, 37 headshot, 41 rivet_gun',
        habitat: 'factory', rarity: 'uncommon', class: 'normal' },
      steelmog_ace: { moogle: 'Steelmog', job: 'e9_automaton_ace', type2: 'ranger', base: B(82, 120, 78, 68, 72, 95), rate: 45, exp: 236, curve: 'medium', fur: '#e6e6ea', pom: '#e0b030',
        abilities: ['overheat', 'marksman', 'rapid_fire'],
        desc: 'Built a robot queen that fights at its side. The queen is quite sure she built it.',
        learn: '34 automaton, 37 chainsaw, 40 buckshot, 43 hypercharge, 46 satellite_beam',
        habitat: 'factory', rarity: 'uncommon', class: 'normal' },

      // ---- Twirlmog: Fan Twirler to Dancer
      twirlmog_twirler: { moogle: 'Twirlmog', job: 'e9_fan_twirler', base: B(50, 45, 42, 62, 48, 73), rate: 170, exp: 60, curve: 'medium', fur: '#fbefe8', pom: '#ff60a0',
        evo: { at: 23, to: 'twirlmog_dancer' }, abilities: ['sylph_dance', 'encore', 'opening_act'],
        desc: 'Dances on sunny beaches with two painted fans. It fans itself between steps, as dancing is hot work.',
        learn: '1 sonic_chord, 1 love_sonata, 4 crescendo, 8 snowman_jazz, 12 wind_song, 16 dusk_requiem, 19 sonic_chord, 22 moonlit_waltz, 27 requiem',
        habitat: 'beach', rarity: 'common', class: 'normal' },
      twirlmog_dancer: { moogle: 'Twirlmog', job: 'e9_star_dancer', type2: 'monk', base: B(70, 65, 58, 98, 72, 112), rate: 70, exp: 214, curve: 'medium', fur: '#fbefe8', pom: '#ff60a0',
        abilities: ['sylph_dance', 'encore', 'opening_act'],
        desc: 'Its steps leave trails of light on the sand. Its partners twirl away dizzy and very happy.',
        learn: '23 chi_blast, 26 crescendo, 29 tempt, 32 drop_the_beat, 35 requiem, 38 sonic_chord, 41 moonlit_waltz, 44 chi_blast, 47 aria',
        habitat: 'beach', rarity: 'common', class: 'normal' },

      // ---- Vermog: Rapierist to Red Mage
      vermog_rapierist: { moogle: 'Vermog', job: 'e9_rapierist', base: B(50, 58, 48, 64, 50, 60), rate: 140, exp: 62, curve: 'medium', fur: '#f6ece6', pom: '#e02040',
        evo: { at: 24, to: 'vermog_red_mage' }, abilities: ['vermilion_fury', 'swiftcast'],
        desc: 'Fences with a magic rapier and a book of spells. It casts first and asks questions halfway through.',
        learn: '1 jolt, 1 embolden, 4 riposte, 8 verthunder, 12 dualcast, 15 corps_a_corps, 18 en_garde, 21 verstone, 27 zwerchhau',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal' },
      vermog_red_mage: { moogle: 'Vermog', job: 'e9_vermilion_mage', type2: 'warrior', base: B(70, 92, 65, 102, 70, 91), rate: 60, exp: 216, curve: 'medium', fur: '#f6ece6', pom: '#e02040',
        abilities: ['vermilion_fury', 'swiftcast'],
        desc: 'Mixes black and white magic into one long rapier combo. Its hat feather twitches when it shows off, so always.',
        learn: '24 zwerchhau, 27 blade_beam, 30 manafication, 33 jolt, 36 contre_sixte, 39 redoublement, 42 embolden, 45 jolt, 48 verflare',
        habitat: 'mountain', rarity: 'uncommon', class: 'normal' },

      // ---- Pictopom: Doodler to Pictomancer
      pictopom_doodler: { moogle: 'Pictopom', job: 'e9_doodler', base: B(48, 35, 42, 72, 55, 63), rate: 150, exp: 62, curve: 'medium', fur: '#f6f2ea', pom: '#8a60ff',
        evo: { at: 26, to: 'pictopom_painter' }, abilities: ['spellcraft', 'hex'],
        desc: 'Paints little moogles that come to life for a moment. They wave, and then they drip.',
        learn: '1 paint_splash, 1 pout, 4 drizzle, 8 brush_stroke, 12 mirage, 15 element_orb, 18 paint_splash, 22 pom_muse, 30 holy_glare',
        habitat: 'sky', rarity: 'uncommon', class: 'normal' },
      pictopom_painter: { moogle: 'Pictopom', job: 'e9_motif_painter', type2: 'summoner', base: B(70, 45, 60, 112, 80, 98), rate: 60, exp: 214, curve: 'medium', fur: '#f6f2ea', pom: '#8a60ff',
        abilities: ['spellcraft', 'hex'],
        desc: 'Its paintings leap off the canvas and join the fight. The art critics in its town are very, very polite.',
        learn: '26 living_muse, 29 holy_glare, 32 magick_barrier, 35 phantasm, 38 paint_splash, 41 element_orb, 44 rainbow_drip, 47 living_muse',
        habitat: 'sky', rarity: 'uncommon', class: 'normal' },

      // ---- Carnivamog: the masked arena's Blue Mage (one stage)
      carnivamog_blue_mage: { moogle: 'Carnivamog', job: 'e9_carnival_blue', type2: 'beast', base: B(75, 70, 68, 95, 75, 82), rate: 45, exp: 186, curve: 'slow', fur: '#e6ecf8', pom: '#2050e0',
        abilities: ['blue_learning', 'hex', 'magic_eater'],
        desc: 'Learns its moves from the monsters of a masked arena. Some of what it learned would be better left unlearned.',
        learn: '1 goblin_punch, 1 bad_breath, 5 drizzle, 9 mind_blast, 13 white_wind, 17 goblin_punch, 21 demi_spell, 25 whisker_blast, 29 aqua_breath, 33 verstone, 37 thousand_needles, 41 limit_glove, 44 goblin_punch, 47 kupo_kaboom',
        habitat: 'crater', rarity: 'rare', class: 'normal' },

      // ---- Stitchpom: Leatherworker, Weaver, Couturier
      stitchpom_leatherworker: { moogle: 'Stitchpom', job: 'e9_leatherworker', base: B(52, 56, 50, 51, 50, 46), rate: 180, exp: 60, curve: 'medium', fur: '#f2e8dc', pom: '#c060a0',
        evo: { at: 16, to: 'stitchpom_weaver' }, abilities: ['finesse', 'thick_wool'],
        desc: 'Cuts and stitches leather all day long. Its paws smell of saddle oil, which it calls a perfume.',
        learn: '1 lasso, 1 pout, 4 hedge_clip, 7 whip_crack, 10 spider_silk, 13 wool, 19 lasso, 23 paw_swat',
        habitat: 'town', rarity: 'common', class: 'normal' },
      stitchpom_weaver: { moogle: 'Stitchpom', job: 'e9_weaver', type2: 'beast', base: B(68, 62, 64, 80, 70, 61), rate: 90, exp: 140, curve: 'medium', fur: '#f2e8dc', pom: '#c060a0',
        evo: { at: 32, to: 'stitchpom_couturier' }, abilities: ['finesse', 'thick_wool'],
        desc: "Spins thread finer than a spider's silk. The spiders have asked it, politely, to stop showing off.",
        learn: '16 strum, 19 love_sonata, 22 high_note, 25 lasso, 28 moonlit_waltz, 30 hymn, 36 big_top, 40 strum',
        habitat: 'town', rarity: 'common', class: 'normal' },
      stitchpom_couturier: { moogle: 'Stitchpom', job: 'e9_couturier', type2: 'redmage', base: B(85, 70, 78, 108, 92, 82), rate: 45, exp: 236, curve: 'medium', fur: '#f2e8dc', pom: '#c060a0',
        abilities: ['e9_fashion_report', 'thick_wool'],
        desc: 'Judges every outfit at the golden game palace. To it, wearing the same hat twice is a crime.',
        learn: '32 mirage, 35 card_trick, 38 hat_trick, 41 phantasm, 44 strum, 47 aria',
        habitat: 'town', rarity: 'common', class: 'normal' },

      // ---- Anvilmog: Blacksmith to Armorer
      anvilmog_blacksmith: { moogle: 'Anvilmog', job: 'e9_blacksmith', base: B(65, 70, 65, 30, 45, 35), rate: 170, exp: 62, curve: 'medium', fur: '#e8dcd0', pom: '#ff6020',
        evo: { at: 22, to: 'anvilmog_armorer' }, abilities: ['heavy_armor', 'battle_scars'],
        desc: "Hammers out blades in a hot forge by the docks. It sings to the anvil; the anvil never sings back.",
        learn: '1 axe_chop, 1 warcry, 4 shield_bash, 8 flame_rod, 12 full_break, 15 iron_wall, 18 axe_chop, 21 retort, 26 cleave',
        habitat: 'volcano', rarity: 'common', class: 'normal' },
      anvilmog_armorer: { moogle: 'Anvilmog', job: 'e9_armorer', type2: 'warrior', base: B(95, 102, 112, 40, 70, 41), rate: 70, exp: 212, curve: 'medium', fur: '#e8dcd0', pom: '#ff6020',
        abilities: ['heavy_armor', 'battle_scars'],
        desc: 'Wears every piece of armor it ever made, all at once. It keeps clanking for a minute after it stops.',
        learn: '22 rend_weapon, 25 shield_bash, 28 shield_wall, 31 aegis_slam, 34 burning_rave, 37 axe_chop, 40 juggernaut, 43 full_break, 46 entrench',
        habitat: 'volcano', rarity: 'common', class: 'normal' },

      // ---- Phialmog: Alchemist to Goldsmith
      phialmog_philterer: { moogle: 'Phialmog', job: 'e9_philterer', base: B(55, 40, 52, 66, 55, 52), rate: 150, exp: 62, curve: 'medium', fur: '#ecf0e4', pom: '#a040ff',
        evo: { at: 25, to: 'phialmog_goldsmith' }, abilities: ['hex', 'gas_mask'],
        desc: 'Brews bubbling philters in a swampy cottage. It tastes every one, which explains its colour.',
        learn: '1 fire, 1 potion, 4 bog_brew, 8 scathe, 12 mini_spell, 15 envenom, 18 hot_coal, 21 aspir, 29 bio',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal' },
      phialmog_goldsmith: { moogle: 'Phialmog', job: 'e9_goldsmith', type2: 'blackmage', base: B(78, 58, 80, 100, 85, 69), rate: 65, exp: 212, curve: 'medium', fur: '#ecf0e4', pom: '#a040ff',
        abilities: ['gilded_body', 'gas_mask'],
        desc: 'Swore it could turn lead into gold, then became a goldsmith to keep the story going.',
        learn: '25 shrink_ray, 28 tracer_beam, 31 gil_toss, 34 swap_parts, 37 wildfire_oil, 40 scathe, 43 arc_relay, 46 firaga',
        habitat: 'swamp', rarity: 'uncommon', class: 'normal' },

      // ---- Ladlemog: Kitchen Hand to Culinarian
      ladlemog_kitchen_hand: { moogle: 'Ladlemog', job: 'e9_kitchen_hand', base: B(68, 58, 52, 45, 52, 45), rate: 180, exp: 60, curve: 'fast', fur: '#f8f2e6', pom: '#ffa030',
        evo: { at: 20, to: 'ladlemog_culinarian' }, abilities: ['medicine', 'coin_up'],
        desc: 'Peels potatoes in a busy harbour kitchen. It peels so fast that the potatoes look surprised.',
        learn: '1 frying_pan, 1 pout, 4 snack_break, 7 pom_bop, 10 flambe, 13 accumulate, 16 frying_pan, 24 kupo_toss, 28 flambe',
        habitat: 'beach', rarity: 'common', class: 'normal' },
      ladlemog_culinarian: { moogle: 'Ladlemog', job: 'e9_culinarian', type2: 'whitemage', base: B(105, 88, 75, 70, 80, 52), rate: 75, exp: 208, curve: 'fast', fur: '#f8f2e6', pom: '#ffa030',
        abilities: ['medicine', 'coin_up'],
        desc: 'Cooks a five-course meal in the middle of a battle. Its foes often stop fighting to ask for the recipe.',
        learn: '20 holy_mace, 23 liturgy_bell, 26 life_ring, 29 kupo_toss, 32 mog_shield, 35 frying_pan, 38 holy_mace, 41 snack_break, 44 full_course',
        habitat: 'beach', rarity: 'common', class: 'normal' },

      // ---- Whiskmog: Fisher, Ocean Fisher, Spearfisher
      whiskmog_caster: { moogle: 'Whiskmog', job: 'e9_line_caster', base: B(55, 60, 50, 38, 45, 50), rate: 180, exp: 60, curve: 'fast', fur: '#e8f0f4', pom: '#30a0d0', nose: '#5a7a8a',
        evo: { at: 18, to: 'whiskmog_fisher' }, abilities: ['wait_mode', 'sure_hit'],
        desc: 'Fishes off any dock it can find. Its whiskery friends from the shallows show it all the best spots.',
        learn: '1 cast_line, 1 hunters_mark, 4 bubble_burst, 8 reel_in, 11 snare_line, 14 eagle_eye, 17 cast_line, 21 spear_gun, 25 wave_ride',
        habitat: 'sea', rarity: 'common', class: 'normal' },
      whiskmog_fisher: { moogle: 'Whiskmog', job: 'e9_ocean_fisher', base: B(75, 82, 66, 48, 60, 70), rate: 90, exp: 140, curve: 'fast', fur: '#e8f0f4', pom: '#30a0d0', nose: '#5a7a8a',
        evo: { at: 35, to: 'whiskmog_spearfisher' }, abilities: ['wait_mode', 'sure_hit'],
        desc: "Rides the big ferry out to fish the deep sea. Every catch is 'the biggest one yet', loudly.",
        learn: '18 web_snare, 21 spear_gun, 24 wave_ride, 27 anchor_drop, 30 aim, 33 bubble_burst, 38 depth_charge, 42 cast_line',
        habitat: 'sea', rarity: 'common', class: 'normal' },
      whiskmog_spearfisher: { moogle: 'Whiskmog', job: 'e9_spearfisher', type2: 'dragoon', base: B(95, 112, 82, 60, 75, 92), rate: 45, exp: 234, curve: 'fast', fur: '#e8f0f4', pom: '#30a0d0', nose: '#5a7a8a',
        abilities: ['wait_mode', 'sure_hit'],
        desc: 'Dives in with a trident and comes back up with dinner. The fish have learned to recognise its pom-pom.',
        learn: '35 harpoon, 38 penta_thrust, 41 thrust, 44 dragon_fang, 47 depth_charge',
        habitat: 'sea', rarity: 'common', class: 'normal' },

      // ---- Chakrapom: Fistfighter, Monk, Fist of Rhalgr
      chakrapom_fistfighter: { moogle: 'Chakrapom', job: 'e9_fistfighter', base: B(50, 68, 45, 35, 42, 62), rate: 170, exp: 60, curve: 'medium', fur: '#f2e4d0', pom: '#ff7020',
        evo: { at: 18, to: 'chakrapom_monk' }, abilities: ['riddle_of_fire', 'brawler_soul', 'zen_mind'],
        desc: 'Spars in a dusty fighting pit, counting every punch out loud. It has lost count at three many times.',
        learn: '1 combo_chain, 1 pout, 4 quick_jab, 7 leg_sweep, 10 kiai, 13 one_inch_punch, 16 combo_chain, 21 burning_rave, 25 quick_jab, 29 leg_sweep',
        habitat: 'mountain', rarity: 'common', class: 'normal' },
      chakrapom_monk: { moogle: 'Chakrapom', job: 'e9_chakra_monk', base: B(68, 95, 60, 45, 55, 85), rate: 90, exp: 142, curve: 'medium', fur: '#f2e4d0', pom: '#ff7020',
        evo: { at: 34, to: 'chakrapom_rhalgr' }, abilities: ['riddle_of_fire', 'brawler_soul', 'zen_mind'],
        desc: 'Opens its chakras one at a time. The fifth one is very ticklish.',
        learn: '18 burning_rave, 21 mantra, 24 palm_strike, 27 mach_kick, 30 perfect_counter, 33 quick_jab, 37 six_sided_star, 41 combo_chain, 45 leg_sweep',
        habitat: 'mountain', rarity: 'common', class: 'normal' },
      chakrapom_rhalgr: { moogle: 'Chakrapom', job: 'e9_rhalgr_fist', type2: 'dragoon', base: B(82, 128, 72, 55, 68, 112), rate: 45, exp: 236, curve: 'medium', fur: '#f2e4d0', pom: '#ff7020',
        abilities: ['riddle_of_fire', 'brawler_soul', 'zen_mind'],
        desc: 'Strikes as fast as the wind and as hard as a falling star. The mountain temples ring their bells when it trains.',
        learn: '34 wyrm_dance, 37 dive_bomb, 40 combo_chain, 43 riddle_of_earth, 46 six_sided_star',
        habitat: 'mountain', rarity: 'common', class: 'normal' },

      // ---- Cactpom: the golden game palace's lucky-ticket host (one stage)
      cactpom_host: { moogle: 'Cactpom', job: 'e9_cactpot_host', type2: 'bard', base: B(70, 88, 65, 72, 70, 105), rate: 60, exp: 182, curve: 'medium', fur: '#f4eedc', pom: '#7ac040', nose: '#e8c030',
        abilities: ['kupo_luck', 'coin_up', 'wild_card'],
        desc: 'Runs the lucky-ticket booth at the golden game palace. It swears the big prize is real; nobody has ever seen it.',
        learn: '1 dice, 1 pout, 5 party_horn, 9 e9_mini_cactpot, 13 heckle_riff, 17 dice, 21 card_trick, 25 shift_break, 29 sleight_of_hand, 33 party_horn, 37 fanfare, 41 e9_mini_cactpot, 44 dice, 47 jackpot',
        habitat: 'town', rarity: 'uncommon', class: 'normal' },
    },

    // ------------------------------------------------------------------ the Kupodex order (line by line)
    dex: [
      'mogpendragon_gladiator', 'mogpendragon_sultansworn', 'mogpendragon_paladin',
      'kupkakupp_lancer', 'kupkakupp_dragoon', 'kupkakupp_azure_dragoon',
      'mogwin_conjurer', 'mogwin_greenwarden', 'mogwin_seedseer',
      'mogmont_archer', 'mogmont_bard',
      'mogzun_miner', 'mogzun_blast_miner',
      'mogmul_botanist', 'mogmul_carpenter',
      'mogtrove_trove_keeper',
      'thaumog_thaumaturge', 'thaumog_umbral_mage', 'thaumog_astral_archon',
      'kupuncle_arcanist', 'kupuncle_gem_summoner', 'kupuncle_solar_summoner',
      'pixipom_pupil', 'pixipom_scholar',
      'starkupo_card_reader', 'starkupo_astrologian', 'starkupo_star_arbiter',
      'noulikin_physician', 'noulikin_sage',
      'mudrakin_rogue', 'mudrakin_ninja', 'mudrakin_mudra_master',
      'mogwolf_marauder', 'mogwolf_warrior', 'mogwolf_sea_wolf',
      'bulletpom_cadet', 'bulletpom_gunbreaker',
      'duskmog_shadowsworn', 'duskmog_dark_knight',
      'tsubamog_ronin', 'tsubamog_samurai',
      'reapom_novice', 'reapom_reaper',
      'fangmog_novice', 'fangmog_viper',
      'steelmog_gunsmith', 'steelmog_machinist', 'steelmog_ace',
      'twirlmog_twirler', 'twirlmog_dancer',
      'vermog_rapierist', 'vermog_red_mage',
      'pictopom_doodler', 'pictopom_painter',
      'carnivamog_blue_mage',
      'stitchpom_leatherworker', 'stitchpom_weaver', 'stitchpom_couturier',
      'anvilmog_blacksmith', 'anvilmog_armorer',
      'phialmog_philterer', 'phialmog_goldsmith',
      'ladlemog_kitchen_hand', 'ladlemog_culinarian',
      'whiskmog_caster', 'whiskmog_fisher', 'whiskmog_spearfisher',
      'chakrapom_fistfighter', 'chakrapom_monk', 'chakrapom_rhalgr',
      'cactpom_host',
    ],
  });
})();

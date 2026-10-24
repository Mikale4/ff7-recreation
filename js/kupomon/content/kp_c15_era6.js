// Kupomon expansion pack 'era6' (docs/KUPOMON_CONTENT.md): the moogles of FF X, X-2 and FF XI, as Cait Sith's robot
// moogles took them up (homage, our own words). Spira: the summoner's pilgrimage and the Sending, a Ronso guardian, a
// blitzball star, the Al Bhed diggers, the Crusaders, Yevon's warrior monks, the Sphere Grid, a gunman for hire and his
// dog, a doll-throwing black mage of the frozen woods, the Calm Lands' trainers, pyreflies, fiends and the Unsent, and
// the dreaming fayth and their Aeons. X-2's dresspheres: the gunner who becomes a gun mage and a flower, the sphere
// hunter who turns Lady Luck, the songstress, the trainer and the mascot (a moogle in a moogle suit). Vana'diel: the Mog
// House and the Mog Garden, the Tarutaru scholars, an Elvaan paladin, a Mithra ninja, the Galka guard who becomes the
// Shadow Lord (the pack's pseudo-legendary), the wyvern dragoons, the puppetmaster and its automaton, the corsair's
// Phantom Roll, the geomancer's luopan, the rune fencer, the blue mage Immortals, the bard, the avatar caller, the
// airships and chocobo digging.
(function () {
  const KP = FF7.kupomon;
  const B = (hp, atk, def, mag, res, spd) => ({ hp, atk, def, mag, res, spd });
  KP.content('era6', {
    // ------------------------------------------------------------------ jobs (one per stage; the look grows grander)
    jobs: {
      // Spira's summoners
      e6_apprentice: { name: 'Apprentice', type: 'summoner', look: { hat: 'lotus', body: 'hakama', weapon: 'staff', g1: '#f2f0f8', g2: '#3a6ad0' } },
      e6_pilgrim: { name: 'Pilgrim', type: 'summoner', look: { hat: 'sunhat', body: 'hakama', weapon: 'ringstaff', g1: '#f4f2fa', g2: '#2a4ab0' } },
      e6_high_summoner: { name: 'High Summoner', type: 'summoner', look: { hat: 'hornhood', body: 'gown', weapon: 'ringstaff', cape: '#3a5ad0', extra: ['wisps'], g1: '#ffffff', g2: '#d8b040' } },
      // blitzball
      e6_blitz_rookie: { name: 'Blitz Rookie', type: 'ranger', look: { hat: 'sweatband', body: 'jersey', weapon: 'balls', g1: '#e89020', g2: '#2a6ad0' } },
      e6_blitzballer: { name: 'Blitzballer', type: 'ranger', look: { hat: 'swimcap', body: 'rashguard', weapon: 'balls', g1: '#2a6ad0', g2: '#f0c030' } },
      e6_blitz_ace: { name: 'Blitz Ace', type: 'ranger', look: { hat: 'surfhair', body: 'jersey', weapon: 'balls', cape: '#1a3a8a', g1: '#ffd040', g2: '#1a3a8a' } },
      // the Sphere Grid
      e6_sphere_novice: { name: 'Sphere Novice', type: 'freelancer', look: { hat: 'none', body: 'satchel', weapon: 'orb', g1: '#40a0e0', g2: '#80e0ff' } },
      e6_grid_walker: { name: 'Grid Walker', type: 'freelancer', look: { hat: 'goggles', body: 'backpack', weapon: 'starglobe', g1: '#3a7ad0', g2: '#f0d040' } },
      e6_sphere_master: { name: 'Sphere Master', type: 'freelancer', look: { hat: 'skyseer', body: 'starcoat', weapon: 'starglobe', extra: ['wisps'], g1: '#2a4aa0', g2: '#80e0ff' } },
      // the Tarutaru of Windurst
      e6_star_onion: { name: 'Star Onion', type: 'blackmage', look: { hat: 'onion', body: 'scarf', weapon: 'wand', g1: '#e8a030', g2: '#4a7a3a' } },
      e6_arts_scholar: { name: 'Arts Scholar', type: 'blackmage', look: { hat: 'quillcap', body: 'robe', weapon: 'grimoire', g1: '#3a3a6a', g2: '#d8b040' } },
      e6_star_sibyl: { name: 'Star Sibyl', type: 'blackmage', look: { hat: 'observatory', body: 'starcoat', weapon: 'moonstaff', cape: '#3a2a7a', g1: '#2a2a6a', g2: '#ffe080' } },
      // the Galka who became the Shadow Lord (pseudo-legendary)
      e6_galka_guard: { name: 'Galka Guard', type: 'knight', look: { hat: 'bascinet', body: 'armor', weapon: 'broadsword', shield: 'round', g1: '#8a6a4a', g2: '#6a6a72' } },
      e6_abyss_knight: { name: 'Abyss Knight', type: 'knight', look: { hat: 'darkknight', body: 'darkplate', weapon: 'scythe', cape: '#2a0a1a', g1: '#3a1a3a', g2: '#7a2a4a', eyes: '#ff4040' } },
      e6_shadow_lord: { name: 'Shadow Lord', type: 'knight', look: { hat: 'ravagerhelm', body: 'darkplate', weapon: 'darksword', cape: '#8a1020', extra: ['wisps'], shadowFace: true, eyes: '#ff2020', g1: '#1a1a22', g2: '#8a1a2a' } },
      // the Elvaan knights of San d'Oria
      e6_royal_page: { name: 'Royal Page', type: 'knight', look: { hat: 'pagecap', body: 'doublet', weapon: 'shortsword', shield: 'round', g1: '#c03040', g2: '#e8e0c8' } },
      e6_temple_knight: { name: 'Temple Knight', type: 'knight', look: { hat: 'visor', body: 'tabard', weapon: 'sword', shield: 'kite', g1: '#c03040', g2: '#d8dce4' } },
      e6_royal_paladin: { name: 'Royal Paladin', type: 'knight', look: { hat: 'paladin', body: 'plate', weapon: 'holysword', shield: 'tower', cape: '#c02030', g1: '#f0f0f4', g2: '#d8b040' } },
      // the wyvern dragoons
      e6_pikeman: { name: 'Pikeman', type: 'dragoon', look: { hat: 'mailcoif', body: 'tabard', weapon: 'spear', g1: '#4a6a9a', g2: '#c8ccd4' } },
      e6_wyvern_rider: { name: 'Wyvern Rider', type: 'dragoon', look: { hat: 'wyvernhood', body: 'scale', weapon: 'lance', extra: ['dragonpet'], g1: '#3a5aa0', g2: '#d8c070' } },
      e6_spirit_dragoon: { name: 'Spirit Dragoon', type: 'dragoon', look: { hat: 'dragoon', body: 'scale', weapon: 'lance', cape: '#2a3a8a', extra: ['dragonpet', 'dragonwings'], g1: '#2a3a8a', g2: '#e8d070' } },
      // the Al Bhed
      e6_sand_digger: { name: 'Sand Digger', type: 'machinist', look: { hat: 'goggles', body: 'overalls', weapon: 'shovel', g1: '#e8b040', g2: '#4a8a3a' } },
      e6_salvager: { name: 'Salvager', type: 'machinist', look: { hat: 'headwrap', body: 'harness', weapon: 'wrench', g1: '#e8c040', g2: '#3a7a3a' } },
      e6_machina_master: { name: 'Machina Master', type: 'machinist', look: { hat: 'gadgethelm', body: 'gadgetpack', weapon: 'tekcannon', extra: ['jetpack'], g1: '#d8a030', g2: '#2a6a4a' } },
      // pyreflies, fiends and the Unsent
      e6_pyrefly: { name: 'Pyrefly', type: 'summoner', look: { hat: 'none', body: 'shroud', weapon: 'lantern', extra: ['wisps'], g1: '#e0f0ff', g2: '#80c0ff' } },
      e6_fiend: { name: 'Fiend', type: 'summoner', look: { hat: 'beastmask', body: 'tendrils', weapon: 'claw', extra: ['wisps'], g1: '#5a3a7a', g2: '#a0e0ff' } },
      e6_unsent: { name: 'Unsent', type: 'summoner', look: { hat: 'netherhood', body: 'mantle', weapon: 'nethercore', cape: '#3a2a5a', extra: ['wisps'], shadowFace: true, eyes: '#a0e0ff', g1: '#2a2a3a', g2: '#80c0ff' } },
      // X-2: the gunner's dresspheres
      e6_pistoleer: { name: 'Pistoleer', type: 'machinist', look: { hat: 'hoodcape', body: 'harness', weapon: 'pistol', g1: '#2a5ad0', g2: '#f0f0f0' } },
      e6_gun_mage: { name: 'Gun Mage', type: 'machinist', look: { hat: 'feathercap', body: 'longcoat', weapon: 'rifle', g1: '#2a3a8a', g2: '#d8c070' } },
      e6_floral_fallal: { name: 'Floral Fallal', type: 'machinist', look: { hat: 'flowercrown', body: 'gown', weapon: 'bouquet', cape: '#e070a0', extra: ['wisps'], g1: '#f0a0c0', g2: '#3a9a5a' } },
      // the Ronso of the snowy mountain
      e6_ronso_cub: { name: 'Ronso Cub', type: 'dragoon', look: { hat: 'horn', body: 'mane', weapon: 'spear', g1: '#4a6ad0', g2: '#d8c070' } },
      e6_ronso_lancer: { name: 'Ronso Lancer', type: 'dragoon', look: { hat: 'band', body: 'harness', weapon: 'lance', g1: '#3a5ac0', g2: '#c8a040' } },
      e6_ronso_guardian: { name: 'Ronso Guardian', type: 'dragoon', look: { hat: 'horncrown', body: 'mane', weapon: 'lance', cape: '#2a3a8a', g1: '#2a4ab0', g2: '#e8d070' } },
      // Vana'diel's bards
      e6_balladeer: { name: 'Balladeer', type: 'bard', look: { hat: 'greenhat', body: 'doublet', weapon: 'flute', g1: '#3a7a4a', g2: '#e8c050' } },
      e6_troubadour: { name: 'Troubadour', type: 'bard', look: { hat: 'plumed', body: 'waistcoat', weapon: 'harp', g1: '#7a3a8a', g2: '#e8d070' } },
      e6_virtuoso: { name: 'Virtuoso', type: 'bard', look: { hat: 'musketeer', body: 'duelcoat', weapon: 'harp', cape: '#8a2a6a', g1: '#8a2a6a', g2: '#f0d878' } },
      // Yevon's warrior monks
      e6_temple_novice: { name: 'Temple Novice', type: 'monk', look: { hat: 'skullcap', body: 'monkrobe', weapon: 'quarterstaff', g1: '#e8e0d0', g2: '#c8a040' } },
      e6_warrior_monk: { name: 'Warrior Monk', type: 'monk', look: { hat: 'templar', body: 'tabard', weapon: 'rifle', g1: '#c8c0b0', g2: '#a03028' } },
      // the Crusaders
      e6_recruit: { name: 'Recruit', type: 'warrior', look: { hat: 'armyhelm', body: 'vest', weapon: 'shortsword', shield: 'round', g1: '#a8b0c0', g2: '#c03030' } },
      e6_crusader: { name: 'Crusader', type: 'warrior', look: { hat: 'chocohelm', body: 'plate', weapon: 'broadsword', shield: 'kite', cape: '#c03030', g1: '#b8bcc8', g2: '#c03030' } },
      // the swordsman for hire and his dog
      e6_hired_blade: { name: 'Hired Blade', type: 'warrior', look: { hat: 'kasa', body: 'hakama', weapon: 'katana', g1: '#5a4a3a', g2: '#a8a8b0' } },
      e6_yojimbo: { name: 'Yojimbo', type: 'warrior', look: { hat: 'ronintail', body: 'cloak', weapon: 'nodachi', g1: '#2a2a3a', g2: '#c03030' } },
      // the doll mage of the frozen woods
      e6_doll_mage: { name: 'Doll Mage', type: 'blackmage', look: { hat: 'veil', body: 'gown', weapon: 'puppet', g1: '#2a2a3a', g2: '#8a2a6a' } },
      e6_fury_mage: { name: 'Fury Mage', type: 'blackmage', look: { hat: 'tiara', body: 'cloak', weapon: 'puppet', cape: '#4a1a3a', extra: ['wisps'], g1: '#1a1a2a', g2: '#a03070' } },
      // the Calm Lands' trainers and the beastmasters
      e6_trainer: { name: 'Trainer', type: 'beast', look: { hat: 'ballcap', body: 'vest', weapon: 'feedpole', extra: ['falcon'], g1: '#d07030', g2: '#4a6a3a' } },
      e6_beastlord: { name: 'Beastlord', type: 'beast', look: { hat: 'trapperhat', body: 'furcollar', weapon: 'axe', extra: ['falcon'], g1: '#7a4a2a', g2: '#c8a040' } },
      // the Mog House and the Mog Garden
      e6_housekeeper: { name: 'Housekeeper', type: 'freelancer', look: { hat: 'kerchief', body: 'apron', weapon: 'pushbroom', g1: '#e8d8c0', g2: '#c04040' } },
      e6_mog_gardener: { name: 'Mog Gardener', type: 'freelancer', look: { hat: 'herbhat', body: 'overalls', weapon: 'wateringcan', g1: '#5a9a4a', g2: '#e8c070' } },
      // X-2: the sphere hunter's dresspheres
      e6_sphere_hunter: { name: 'Sphere Hunter', type: 'thief', look: { hat: 'explorer', body: 'satchel', weapon: 'dagger', g1: '#e0a030', g2: '#2a7a8a' } },
      e6_lady_luck: { name: 'Lady Luck', type: 'thief', look: { hat: 'tophat', body: 'tuxedo', weapon: 'cards', g1: '#c02040', g2: '#f0d040' } },
      // the Mithra
      e6_mithra_scout: { name: 'Mithra Scout', type: 'thief', look: { hat: 'wolfears', body: 'leather', weapon: 'dagger', g1: '#a06030', g2: '#e8d0a0' } },
      e6_shinobi: { name: 'Shinobi', type: 'thief', look: { hat: 'kunoichi', body: 'scarf', weapon: 'shuriken', g1: '#2a2a4a', g2: '#c04040' } },
      // the puppetmaster and its automaton
      e6_harlequin: { name: 'Harlequin', type: 'machinist', look: { hat: 'jester', body: 'diamonds', weapon: 'puppet', g1: '#c03040', g2: '#f0d040' } },
      e6_puppetmaster: { name: 'Puppetmaster', type: 'machinist', look: { hat: 'turban', body: 'sash', weapon: 'puppet', g1: '#3a5a8a', g2: '#e0c060' } },
      // the corsairs
      e6_sea_dog: { name: 'Sea Dog', type: 'ranger', look: { hat: 'bandana', body: 'stripes', weapon: 'flintpistol', g1: '#2a3a6a', g2: '#e8e0d0' } },
      e6_corsair: { name: 'Corsair', type: 'ranger', look: { hat: 'tricorne', body: 'redcoat', weapon: 'flintpistol', cape: '#8a2020', g1: '#8a2020', g2: '#d8b040' } },
      // the geomancers and their luopans
      e6_bellringer: { name: 'Bellringer', type: 'beast', look: { hat: 'stocking', body: 'poncho', weapon: 'bell', g1: '#8a5a3a', g2: '#40c0a0' } },
      e6_luopan_sage: { name: 'Luopan Sage', type: 'beast', look: { hat: 'elemcirclet', body: 'mantle', weapon: 'astrolabe', extra: ['wisps'], g1: '#3a5a4a', g2: '#60e0c0' } },
      // the rune fencers
      e6_rune_scribe: { name: 'Rune Scribe', type: 'redmage', look: { hat: 'beanie', body: 'smock', weapon: 'chisel', g1: '#3a6a8a', g2: '#c8d0d8' } },
      e6_rune_fencer: { name: 'Rune Fencer', type: 'redmage', look: { hat: 'runecirclet', body: 'runeplate', weapon: 'runesword', cape: '#2a4a6a', g1: '#2a4a6a', g2: '#80e0ff' } },
      // the dancer and the songstress
      e6_waltzer: { name: 'Waltzer', type: 'bard', look: { hat: 'ribbon', body: 'streamers', weapon: 'fans', g1: '#e04080', g2: '#f0d060' } },
      e6_songstress: { name: 'Songstress', type: 'bard', look: { hat: 'plume', body: 'gown', weapon: 'microphone', cape: '#d04080', extra: ['wisps'], g1: '#3a3a8a', g2: '#e8e0f0' } },
      // the fayth and their Aeons
      e6_fayth: { name: 'Fayth', type: 'timemage', look: { hat: 'hood', body: 'robe', weapon: 'none', extra: ['wisps'], g1: '#d0e0f0', g2: '#6080c0' } },
      e6_aeon: { name: 'Aeon', type: 'summoner', look: { hat: 'raptorhelm', body: 'featherarmor', weapon: 'none', extra: ['featherwings'], g1: '#c04050', g2: '#e8c050' } },
      // the airships
      e6_rigger: { name: 'Rigger', type: 'machinist', look: { hat: 'workcap', body: 'toolbelt', weapon: 'wrench', g1: '#5a6a8a', g2: '#d8a040' } },
      e6_airship_pilot: { name: 'Airship Pilot', type: 'machinist', look: { hat: 'captain', body: 'trench', weapon: 'telescope', extra: ['jetpack'], g1: '#3a4a6a', g2: '#e0b040' } },
      // one-stage moogles: the avatar caller, the chocobo digger, the mascot
      e6_avatar_caller: { name: 'Avatar Caller', type: 'summoner', look: { hat: 'seer', body: 'robe', weapon: 'staff', extra: ['fairy'], g1: '#2a6a8a', g2: '#e04060' } },
      e6_choco_digger: { name: 'Chocobo Digger', type: 'beast', look: { hat: 'chococrest', body: 'harness', weapon: 'shovel', g1: '#f0d040', g2: '#8a5a30' } },
      e6_mascot: { name: 'Mascot', type: 'freelancer', look: { hat: 'woolhood', body: 'fleece', weapon: 'flag', extra: ['smallwings'], g1: '#f8f4f0', g2: '#e04050' } },
      // the blue mage Immortals
      e6_azure_adept: { name: 'Azure Adept', type: 'redmage', look: { hat: 'mystic', body: 'sash', weapon: 'scimitar', g1: '#2a5ab0', g2: '#d8b040' } },
      e6_immortal: { name: 'Immortal', type: 'redmage', look: { hat: 'bluemask', body: 'patchfur', weapon: 'saber', g1: '#1a3a8a', g2: '#e0c050' } },
    },

    // ------------------------------------------------------------------ signature moves (4)
    moves: {
      e6_sending: { name: 'Sending', type: 'summoner', power: 75, acc: 100, cd: 2, flags: ['dance'], cureTeam: true, desc: "A dance that sends spirits home; it cures its team's ailments too." },
      e6_jecht_shot: { name: 'Jecht Shot', type: 'ranger', power: 95, acc: 95, cd: 2, flinch: 30, flags: ['bullet'], desc: 'The legendary blitz shot, kicked mid-spin. May make the foe flinch.' },
      e6_giga_slash: { name: 'Giga Slash', type: 'knight', power: 100, acc: 95, cd: 2, crit: 1, flags: ['contact', 'slice'], desc: 'A vast sweep of the shadow blade. Likely to crit.' },
      e6_trigger_happy: { name: 'Trigger Happy', type: 'machinist', power: 20, acc: 100, cd: 0, cat: 'magic', hits: [2, 5], flags: ['bullet'], desc: 'Both pistols, no aiming: a spray of charged shots that hits 2-5 times.' },
    },

    // ------------------------------------------------------------------ signature abilities (3)
    abilities: {
      e6_phantom_roll: { name: 'Phantom Roll', desc: 'Rolls each turn: one stat sharply up, one down; crits likelier.', moody: true, crit: 1 },
      e6_shadow_dread: { name: 'Shadow Dread', desc: "A dread aura as it comes out: the foe's Attack and Magic drop.", onEnterBoosts: { foe: { atk: -1, mag: -1 } } },
      e6_moogle_suit: { name: 'Moogle Suit', desc: 'Its suit takes the first hit (1/8 HP); Black Mage hits do 2x.', disguise: true, resist: { blackmage: 2 } },
    },

    // ------------------------------------------------------------------ species
    species: {
      // ---- Pilgrimog: the summoner's pilgrimage (Summoner > Summoner > Summoner/White Mage), ruins
      pilgrimog_apprentice: { moogle: 'Pilgrimog', job: 'e6_apprentice', base: B(50, 30, 40, 60, 55, 45), rate: 150, exp: 60, curve: 'medium', evo: { at: 18, to: 'pilgrimog_pilgrim' },
        fur: '#f6f2ee', pom: '#4a8ae0', habitat: 'ruins', rarity: 'uncommon', abilities: ['summon_bond', 'auto_esuna', 'esper_eater'],
        desc: 'A trainee summoner from an island temple. It practises the sacred dance in puddles, so it is always a little damp.',
        learn: '1 drizzle, 1 pout, 4 searing_light, 7 holy_glare, 10 sylph_breeze, 13 delta_attack, 16 haunt, 18 diamond_dust, 22 hellfire, 26 drizzle, 30 holy_glare, 34 tidal_wave' },
      pilgrimog_pilgrim: { moogle: 'Pilgrimog', job: 'e6_pilgrim', base: B(65, 40, 55, 85, 75, 60), rate: 75, exp: 140, curve: 'medium', evo: { at: 36, to: 'pilgrimog_high_summoner' },
        fur: '#f6f2ee', pom: '#4a8ae0', habitat: 'ruins', rarity: 'uncommon', abilities: ['summon_bond', 'auto_esuna', 'esper_eater'],
        desc: 'Walks the long pilgrimage from temple to temple. Its guardians carry the luggage; it carries the snacks.',
        learn: '18 e6_sending, 21 hellfire, 24 holy_glare, 27 regen_spell, 30 judgment_bolt, 33 haunt, 36 earthen_fury, 40 holy_glare, 44 megaflare' },
      pilgrimog_high_summoner: { moogle: 'Pilgrimog', job: 'e6_high_summoner', type2: 'whitemage', base: B(85, 50, 70, 115, 100, 80), rate: 45, exp: 235, curve: 'medium',
        fur: '#f6f2ee', pom: '#4a8ae0', habitat: 'ruins', rarity: 'uncommon', abilities: ['summon_bond', 'auto_esuna', 'esper_eater'],
        desc: 'It brought a Calm to a whole region. Pyreflies follow its staff home like moths follow a lantern.',
        learn: '36 holy, 39 holy_glare, 42 cura, 45 e6_sending, 48 megaflare' },

      // ---- Aurochmog: blitzball (Ranger > Ranger > Ranger/Monk), sea
      aurochmog_blitz_rookie: { moogle: 'Aurochmog', job: 'e6_blitz_rookie', base: B(45, 55, 40, 30, 35, 65), rate: 190, exp: 56, curve: 'fast', evo: { at: 16, to: 'aurochmog_blitzballer' },
        fur: '#f4efe6', pom: '#f0a020', wing: '#2a6ad0', habitat: 'sea', rarity: 'common', abilities: ['gun_mastery', 'auto_haste', 'rapid_fire'],
        desc: 'Plays blitzball in any puddle deep enough. It has never won a match, but it has never stopped smiling either.',
        learn: '1 bubble_burst, 1 trip, 5 buckshot, 8 kick, 11 leg_shot, 14 repelling_shot, 19 wave_ride, 23 dolphin_blow, 27 seed_cannon, 31 buckshot' },
      aurochmog_blitzballer: { moogle: 'Aurochmog', job: 'e6_blitzballer', base: B(60, 80, 55, 40, 50, 90), rate: 90, exp: 138, curve: 'fast', evo: { at: 32, to: 'aurochmog_blitz_ace' },
        fur: '#f4efe6', pom: '#f0a020', wing: '#2a6ad0', habitat: 'sea', rarity: 'common', abilities: ['gun_mastery', 'auto_haste', 'rapid_fire'],
        desc: 'Holds its breath for a whole half. It practises one famous shot all day long and lands it about once.',
        learn: '16 dolphin_blow, 19 wave_ride, 22 mach_kick, 25 hang_ten, 28 dark_shot, 31 buckshot, 34 wipeout, 38 heel_drop, 42 wave_ride' },
      aurochmog_blitz_ace: { moogle: 'Aurochmog', job: 'e6_blitz_ace', type2: 'monk', base: B(75, 110, 70, 50, 65, 120), rate: 45, exp: 228, curve: 'fast',
        fur: '#f4efe6', pom: '#f0a020', wing: '#2a6ad0', habitat: 'sea', rarity: 'common', abilities: ['gun_mastery', 'auto_haste', 'rapid_fire'],
        desc: 'The star of the sphere pool. The crowd chants its name and it waves back mid-shot, which is just showing off.',
        learn: '32 e6_jecht_shot, 35 wave_ride, 39 heel_drop, 43 wipeout' },

      // ---- Spheremog: the Sphere Grid (Freelancer > Freelancer/Red Mage > Freelancer/Red Mage), lifestream
      spheremog_sphere_novice: { moogle: 'Spheremog', job: 'e6_sphere_novice', base: B(50, 45, 45, 50, 45, 45), rate: 160, exp: 58, curve: 'medium', evo: { at: 20, to: 'spheremog_grid_walker' },
        fur: '#eef2f8', pom: '#40c0ff', habitat: 'lifestream', rarity: 'uncommon', abilities: ['amplifier', 'fast_learner'],
        desc: 'Collects little glowing spheres and slots them into itself. Nobody is sure it knows what any of them do.',
        learn: '1 pom_bop, 1 accumulate, 5 kupo_holler, 9 pom_flurry, 13 meditation, 17 ultima_charge, 22 job_strike, 26 pom_bop, 30 jolt, 34 mognet_relay' },
      spheremog_grid_walker: { moogle: 'Spheremog', job: 'e6_grid_walker', type2: 'redmage', base: B(70, 60, 60, 75, 60, 65), rate: 90, exp: 140, curve: 'medium', evo: { at: 38, to: 'spheremog_sphere_master' },
        fur: '#eef2f8', pom: '#40c0ff', habitat: 'lifestream', rarity: 'uncommon', abilities: ['amplifier', 'fast_learner'],
        desc: 'Hops from node to node across its own sphere grid. It takes the long way round every time, on purpose.',
        learn: '20 manafication, 23 verstone, 27 dualcast, 30 mognet_relay, 33 kupo_holler, 36 verstone, 40 spellstrike, 44 mana_balance' },
      spheremog_sphere_master: { moogle: 'Spheremog', job: 'e6_sphere_master', type2: 'redmage', base: B(90, 75, 80, 100, 80, 85), rate: 50, exp: 235, curve: 'medium',
        fur: '#eef2f8', pom: '#40c0ff', habitat: 'lifestream', rarity: 'uncommon', abilities: ['amplifier', 'fast_learner'],
        desc: 'Every node on its grid is lit. It can do a little of everything, and it will happily tell you about all of it.',
        learn: '38 ultima_charge, 41 verflare, 44 verstone, 47 meditation' },

      // ---- Tarupom: the Tarutaru scholars (Black Mage > Black Mage/White Mage > Black Mage/White Mage), forest
      tarupom_star_onion: { moogle: 'Tarupom', job: 'e6_star_onion', base: B(40, 25, 35, 65, 50, 60), rate: 170, exp: 56, curve: 'medium', evo: { at: 17, to: 'tarupom_arts_scholar' },
        fur: '#f6ecd8', pom: '#ffd040', habitat: 'forest', rarity: 'common', abilities: ['spellcraft', 'swiftcast', 'mana_tempest'],
        desc: "A member of a children's magic brigade. It is very small, very loud, and has set its own hat on fire twice.",
        learn: '1 fire, 1 pout, 4 blizzard, 7 thunder, 10 sleep_spell, 13 scathe, 16 aspir, 20 fira, 24 fire, 28 envenom, 32 firaga' },
      tarupom_arts_scholar: { moogle: 'Tarupom', job: 'e6_arts_scholar', type2: 'whitemage', base: B(55, 35, 45, 95, 70, 80), rate: 85, exp: 140, curve: 'medium', evo: { at: 34, to: 'tarupom_star_sibyl' },
        fur: '#f6ecd8', pom: '#ffd040', habitat: 'forest', rarity: 'common', abilities: ['spellcraft', 'swiftcast', 'mana_tempest'],
        desc: 'Switches between light and dark arts by flipping its book over. It always opens the wrong chapter first.',
        learn: '17 holy_glare, 20 ley_lines, 23 banishga, 26 scathe, 29 triplecast, 32 dawn_prayer, 36 holy_glare, 40 firaga' },
      tarupom_star_sibyl: { moogle: 'Tarupom', job: 'e6_star_sibyl', type2: 'whitemage', base: B(70, 40, 55, 130, 95, 110), rate: 45, exp: 235, curve: 'medium',
        fur: '#f6ecd8', pom: '#ffd040', habitat: 'forest', rarity: 'common', abilities: ['spellcraft', 'swiftcast', 'mana_tempest'],
        desc: 'Reads the stars over its leafy home town and casts spells to match. It takes its tea at exactly the right minute.',
        learn: '34 flare_star, 37 holy_glare, 40 starfall, 44 scathe, 47 flare' },

      // ---- Grimmog: the pseudo-legendary, a Galka guard turned Shadow Lord (Knight > Knight/Black Mage > Knight/Black Mage), crater
      grimmog_galka_guard: { moogle: 'Grimmog', job: 'e6_galka_guard', class: 'pseudo', base: B(60, 70, 60, 40, 45, 35), rate: 45, exp: 65, curve: 'slow', evo: { at: 30, to: 'grimmog_abyss_knight' },
        fur: '#d8d0c8', pom: '#a02030', wing: '#3a2a3a', habitat: 'crater', rarity: 'rare', abilities: ['menace', 'last_bastion', 'avenger'],
        desc: 'Big, gruff and patient, it stands guard at the mine gates. Pebbles that fall on its head simply bounce off.',
        learn: '1 shield_bash, 1 warcry, 5 rend_armor, 9 cover, 13 keen_edge, 17 aegis_slam, 21 hold_the_line, 25 juggernaut, 29 shield_bash, 34 entrench, 39 keen_edge' },
      grimmog_abyss_knight: { moogle: 'Grimmog', job: 'e6_abyss_knight', type2: 'blackmage', class: 'pseudo', base: B(80, 100, 80, 65, 65, 45), rate: 45, exp: 150, curve: 'slow', evo: { at: 45, to: 'grimmog_shadow_lord' },
        fur: '#d8d0c8', pom: '#a02030', wing: '#3a2a3a', habitat: 'crater', rarity: 'rare', abilities: ['menace', 'last_bastion', 'avenger'],
        desc: 'It went north on a long expedition and came back colder. Its scythe hums one low note in the dark.',
        learn: '30 darkside, 33 drain, 36 sanguine_sword, 39 keen_edge, 42 blood_price, 45 darkness, 48 spirits_within' },
      grimmog_shadow_lord: { moogle: 'Grimmog', job: 'e6_shadow_lord', type2: 'blackmage', class: 'pseudo', base: B(110, 140, 105, 95, 90, 60), rate: 45, exp: 270, curve: 'slow',
        fur: '#d8d0c8', pom: '#a02030', wing: '#3a2a3a', habitat: 'crater', rarity: 'rare', abilities: ['e6_shadow_dread', 'last_bastion', 'avenger'],
        desc: "Betrayed and remade in shadow, it rules a castle on the ice. Even the crater's wind holds its breath as it passes.",
        learn: '45 e6_giga_slash, 48 keen_edge, 50 doom' },

      // ---- Elvamog: the Elvaan knights (Knight > Knight/White Mage > Knight/White Mage), grass
      elvamog_royal_page: { moogle: 'Elvamog', job: 'e6_royal_page', base: B(55, 50, 65, 30, 50, 35), rate: 160, exp: 60, curve: 'medium', evo: { at: 18, to: 'elvamog_temple_knight' },
        fur: '#f4f0ea', pom: '#c03040', habitat: 'grass', rarity: 'uncommon', abilities: ['hold_fast', 'vitality_plus'],
        desc: 'A proud page of the knightly city. Its ears point up when it is pleased, and they are always pointing up.',
        learn: '1 shield_bash, 1 cover, 4 rend_armor, 8 challenge, 11 keen_edge, 14 holy_mace, 18 sheltron, 21 aegis_slam, 25 shield_bash, 29 sentinel, 33 valiant' },
      elvamog_temple_knight: { moogle: 'Elvamog', job: 'e6_temple_knight', type2: 'whitemage', base: B(75, 70, 90, 45, 70, 45), rate: 80, exp: 142, curve: 'medium', evo: { at: 35, to: 'elvamog_royal_paladin' },
        fur: '#f4f0ea', pom: '#c03040', habitat: 'grass', rarity: 'uncommon', abilities: ['hold_fast', 'vitality_plus'],
        desc: 'Took its vows at the cathedral. Its shield bears the crest, and it polishes the crest more than the shield.',
        learn: '18 aegis_slam, 21 keen_edge, 24 cure, 27 shield_wall, 30 shield_bash, 33 retribution, 37 saint_cross, 41 keen_edge' },
      elvamog_royal_paladin: { moogle: 'Elvamog', job: 'e6_royal_paladin', type2: 'whitemage', base: B(100, 90, 125, 60, 100, 50), rate: 45, exp: 240, curve: 'medium',
        fur: '#f4f0ea', pom: '#c03040', habitat: 'grass', rarity: 'uncommon', abilities: ['hold_fast', 'vitality_plus'],
        desc: 'It stands in front of the weak and simply does not move. Several boulders have tried to shift it and given up.',
        learn: '35 spirits_within, 38 sentinel, 41 shield_bash, 44 saint_cross, 47 holy_mace' },

      // ---- Pikepom: the wyvern dragoons (Dragoon > Dragoon/Beast > Dragoon/Beast), mountain
      pikepom_pikeman: { moogle: 'Pikepom', job: 'e6_pikeman', base: B(45, 60, 45, 25, 35, 60), rate: 180, exp: 58, curve: 'medium', evo: { at: 16, to: 'pikepom_wyvern_rider' },
        fur: '#eef0f4', pom: '#3a6ad0', wing: '#5a7ab0', habitat: 'mountain', rarity: 'common', abilities: ['wyvern_wings', 'dragon_spirit'],
        desc: 'Carries a pike three times its own height. Mostly it uses it to knock fruit down from trees.',
        learn: '1 thrust, 1 life_surge, 4 pom_lance, 7 leg_sweep, 10 harpoon, 13 thrust, 15 spear_wall, 19 jump, 23 pom_lance, 27 wyrm_dance, 31 high_jump' },
      pikepom_wyvern_rider: { moogle: 'Pikepom', job: 'e6_wyvern_rider', type2: 'beast', base: B(65, 85, 60, 35, 50, 80), rate: 90, exp: 140, curve: 'medium', evo: { at: 34, to: 'pikepom_spirit_dragoon' },
        fur: '#eef0f4', pom: '#3a6ad0', wing: '#5a7ab0', habitat: 'mountain', rarity: 'common', abilities: ['wyvern_wings', 'dragon_spirit'],
        desc: 'Hatched a tiny wyvern from an egg it found. The wyvern rides on its pom and breathes little healing puffs.',
        learn: '16 soul_jump, 19 bite, 22 reiss_wind, 25 naga_fang, 28 wyrm_dance, 31 thrust, 34 dragonfire_dive, 38 high_jump' },
      pikepom_spirit_dragoon: { moogle: 'Pikepom', job: 'e6_spirit_dragoon', type2: 'beast', base: B(80, 120, 75, 45, 65, 110), rate: 45, exp: 236, curve: 'medium',
        fur: '#eef0f4', pom: '#3a6ad0', wing: '#5a7ab0', habitat: 'mountain', rarity: 'common', abilities: ['wyvern_wings', 'dragon_spirit'],
        desc: 'It and its wyvern share one spirit. They leap together and they land together, usually on the foe.',
        learn: '34 stardiver, 38 bite, 42 wyrm_dance, 46 highwind' },

      // ---- Suukma ("moogle" in its own tongue): the Al Bhed (Machinist > Machinist/Thief > Machinist/Thief), desert
      suukma_sand_digger: { moogle: 'Suukma', job: 'e6_sand_digger', base: B(45, 55, 50, 30, 35, 55), rate: 190, exp: 55, curve: 'fast', evo: { at: 15, to: 'suukma_salvager' },
        fur: '#f2e8d0', pom: '#5ac040', wing: '#d8a030', habitat: 'desert', rarity: 'common', abilities: ['scrap_eater', 'featherweight'],
        desc: 'Its name means moogle in its own tongue. It digs the dunes for buried machina and keeps every last bolt.',
        learn: '1 pickaxe, 1 trip, 4 steal, 8 scattergun, 12 underhand, 16 pickaxe, 20 mine_layer, 24 drill, 28 cave_in' },
      suukma_salvager: { moogle: 'Suukma', job: 'e6_salvager', type2: 'thief', base: B(60, 80, 65, 40, 50, 80), rate: 90, exp: 138, curve: 'fast', evo: { at: 32, to: 'suukma_machina_master' },
        fur: '#f2e8d0', pom: '#5ac040', wing: '#d8a030', habitat: 'desert', rarity: 'common', abilities: ['scrap_eater', 'featherweight'],
        desc: 'Can strip a wreck to the last spring in a minute flat. It will strip yours too if you look away.',
        learn: '15 thievery, 18 wrench, 21 piston_punch, 24 sleight_of_hand, 27 air_anchor, 30 rivet_gun, 33 debilitator, 37 kupo_missile' },
      suukma_machina_master: { moogle: 'Suukma', job: 'e6_machina_master', type2: 'thief', base: B(75, 110, 80, 55, 65, 110), rate: 50, exp: 232, curve: 'fast',
        fur: '#f2e8d0', pom: '#5ac040', wing: '#d8a030', habitat: 'desert', rarity: 'common', abilities: ['scrap_eater', 'featherweight'],
        desc: 'Builds wonderful machines out of desert scrap. Some fly, some shoot, and one of them only makes tea.',
        learn: '32 tek_missile, 36 coup_de_grace, 40 rivet_gun, 44 hypercharge' },

      // ---- Pyremog: pyreflies, fiends and the Unsent (Summoner > Summoner/Beast > Summoner/Black Mage), swamp
      pyremog_pyrefly: { moogle: 'Pyremog', job: 'e6_pyrefly', base: B(40, 30, 35, 60, 50, 60), rate: 170, exp: 57, curve: 'medium', evo: { at: 20, to: 'pyremog_fiend' },
        fur: '#e8eef8', pom: '#80d0ff', wing: '#a0b0e0', habitat: 'swamp', rarity: 'uncommon', abilities: ['tonberry_grudge', 'vampirism', 'shadowbringer'],
        desc: "A swirl of glowing pyreflies that took a moogle's shape. It drifts over the marshes at dusk, humming.",
        learn: '1 haunt, 1 spook, 5 ectoplasm, 9 dread_shade, 13 grave_breath, 17 runaway_train, 21 haunt, 25 nightfall, 29 drain' },
      pyremog_fiend: { moogle: 'Pyremog', job: 'e6_fiend', type2: 'beast', base: B(60, 45, 50, 85, 65, 75), rate: 85, exp: 140, curve: 'medium', evo: { at: 36, to: 'pyremog_unsent' },
        fur: '#e8eef8', pom: '#80d0ff', wing: '#a0b0e0', habitat: 'swamp', rarity: 'uncommon', abilities: ['tonberry_grudge', 'vampirism', 'shadowbringer'],
        desc: 'Pyreflies that lingered too long and turned grumpy. Its claws are cold, and so is its sense of humour.',
        learn: '20 tanglevine, 23 haunt, 26 whisker_blast, 29 ochu_spores, 32 phantom_fade, 36 dread_shade, 40 whisker_blast' },
      pyremog_unsent: { moogle: 'Pyremog', job: 'e6_unsent', type2: 'blackmage', base: B(75, 55, 65, 120, 85, 100), rate: 45, exp: 236, curve: 'medium',
        fur: '#e8eef8', pom: '#80d0ff', wing: '#a0b0e0', habitat: 'swamp', rarity: 'uncommon', abilities: ['tonberry_grudge', 'vampirism', 'shadowbringer'],
        desc: 'It will not go to the Farplane. It has unfinished business and a very, very long to-do list.',
        learn: '36 darkness, 40 voodoo_doll, 44 haunt, 48 ghost_train' },

      // ---- Gullmog: the gunner's dresspheres (Machinist > Machinist/Red Mage > Machinist/Summoner), beach
      gullmog_pistoleer: { moogle: 'Gullmog', job: 'e6_pistoleer', base: B(45, 35, 40, 60, 45, 60), rate: 160, exp: 58, curve: 'medium', evo: { at: 18, to: 'gullmog_gun_mage' },
        fur: '#f6f0ea', pom: '#3a7ae0', habitat: 'beach', rarity: 'uncommon', abilities: ['gun_mastery', 'finesse', 'blue_learning'],
        desc: 'Swapped its staff for twin pistols and joined a crew of sphere hunters. It fires first and twirls second.',
        learn: '1 e6_trigger_happy, 1 mog_guard, 4 tracer_beam, 8 shrink_ray, 12 jolt, 15 arc_relay, 20 e6_trigger_happy, 24 debilitator, 28 shrink_ray, 32 hypercharge' },
      gullmog_gun_mage: { moogle: 'Gullmog', job: 'e6_gun_mage', type2: 'redmage', base: B(60, 45, 55, 85, 60, 80), rate: 80, exp: 140, curve: 'medium', evo: { at: 35, to: 'gullmog_floral_fallal' },
        fur: '#f6f0ea', pom: '#3a7ae0', habitat: 'beach', rarity: 'uncommon', abilities: ['gun_mastery', 'finesse', 'blue_learning'],
        desc: 'Learns tricks from the fiends it fights, then fires them back out of its gun. Very rude, very effective.',
        learn: '18 mind_blast, 21 white_wind, 24 tracer_beam, 27 aqua_breath, 30 limit_glove, 33 verstone, 37 verflare, 41 bad_breath' },
      gullmog_floral_fallal: { moogle: 'Gullmog', job: 'e6_floral_fallal', type2: 'summoner', base: B(75, 55, 70, 115, 85, 105), rate: 45, exp: 236, curve: 'medium',
        fur: '#f6f0ea', pom: '#3a7ae0', habitat: 'beach', rarity: 'uncommon', abilities: ['gun_mastery', 'finesse', 'blue_learning'],
        desc: 'Rides a giant flower that bloomed out of a sphere. Fiends stop to smell it, which is always their big mistake.',
        learn: '35 living_muse, 38 pollen_haze, 41 tracer_beam, 44 earthen_fury, 48 sylph_breeze' },

      // ---- Hornpom: the Ronso guardians (Dragoon > Dragoon > Dragoon/Red Mage), snow
      hornpom_ronso_cub: { moogle: 'Hornpom', job: 'e6_ronso_cub', base: B(55, 60, 45, 35, 40, 45), rate: 150, exp: 60, curve: 'medium', evo: { at: 18, to: 'hornpom_ronso_lancer' },
        fur: '#cfd8f0', pom: '#e0b040', habitat: 'snow', rarity: 'uncommon', abilities: ['blue_learning', 'defiance'],
        desc: 'A cub of the snowy mountain clans. It practises its war cry on mountain goats, who are not impressed.',
        learn: '1 thrust, 1 roar, 4 goblin_punch, 7 lancet, 10 seed_cannon, 13 thrust, 16 leg_sweep, 20 jump, 24 dragon_fang, 28 goblin_punch, 32 bad_breath' },
      hornpom_ronso_lancer: { moogle: 'Hornpom', job: 'e6_ronso_lancer', base: B(75, 85, 60, 50, 55, 60), rate: 75, exp: 142, curve: 'medium', evo: { at: 36, to: 'hornpom_ronso_guardian' },
        fur: '#cfd8f0', pom: '#e0b040', habitat: 'snow', rarity: 'uncommon', abilities: ['blue_learning', 'defiance'],
        desc: 'Its horn broke in a fight it won. It never says a word about it, which says everything.',
        learn: '18 white_wind, 21 goblin_punch, 24 jump, 27 aqua_breath, 30 thrust, 33 magick_barrier, 37 high_jump, 41 bad_breath' },
      hornpom_ronso_guardian: { moogle: 'Hornpom', job: 'e6_ronso_guardian', type2: 'redmage', base: B(95, 115, 75, 65, 75, 85), rate: 45, exp: 238, curve: 'medium',
        fur: '#cfd8f0', pom: '#e0b040', habitat: 'snow', rarity: 'uncommon', abilities: ['blue_learning', 'defiance'],
        desc: 'Sworn to guard one summoner, it keeps its oath through any blizzard, and learns a trick from every foe.',
        learn: '36 high_jump, 40 white_wind, 44 pom_lance, 48 wyvern_crash' },

      // ---- Minuemog: Vana'diel's bards (Bard > Bard > Bard/White Mage), night
      minuemog_balladeer: { moogle: 'Minuemog', job: 'e6_balladeer', base: B(50, 30, 45, 55, 55, 50), rate: 180, exp: 56, curve: 'fast', evo: { at: 16, to: 'minuemog_troubadour' },
        fur: '#f6eee4', pom: '#40b070', habitat: 'night', rarity: 'common', abilities: ['encore', 'kupo_punk'],
        desc: 'Wanders the roads with a flute, playing for its supper. Its songs make swords lighter and feet quicker.',
        learn: '1 hymn, 1 nocturne, 4 crescendo, 7 heckle_riff, 10 snowman_jazz, 13 hymn, 15 warding_carol, 19 high_note, 23 crescendo, 27 dusk_requiem, 31 wind_song' },
      minuemog_troubadour: { moogle: 'Minuemog', job: 'e6_troubadour', base: B(70, 40, 60, 75, 75, 65), rate: 90, exp: 138, curve: 'fast', evo: { at: 34, to: 'minuemog_virtuoso' },
        fur: '#f6eee4', pom: '#40b070', habitat: 'night', rarity: 'common', abilities: ['encore', 'kupo_punk'],
        desc: 'Its ballads mend and its marches hurry. Every tavern in the old trade city knows its pom by sight.',
        learn: '16 regen_spell, 19 holy_glare, 22 dusk_requiem, 25 love_sonata, 28 hymn, 31 requiem, 34 wind_song, 38 symphony' },
      minuemog_virtuoso: { moogle: 'Minuemog', job: 'e6_virtuoso', type2: 'whitemage', base: B(95, 50, 80, 100, 100, 80), rate: 50, exp: 232, curve: 'fast',
        fur: '#f6eee4', pom: '#40b070', habitat: 'night', rarity: 'common', abilities: ['encore', 'kupo_punk'],
        desc: 'Plays two songs at once on one harp. Nobody knows how, and it has given up trying to explain.',
        learn: '34 heros_rime, 38 holy_glare, 42 symphony, 46 cura' },

      // ---- Yevomog: Yevon's warrior monks (Monk > Monk/Machinist), town
      yevomog_temple_novice: { moogle: 'Yevomog', job: 'e6_temple_novice', base: B(55, 65, 50, 30, 40, 45), rate: 170, exp: 58, curve: 'medium', evo: { at: 24, to: 'yevomog_warrior_monk' },
        fur: '#f2ece0', pom: '#c8a040', habitat: 'town', rarity: 'common', abilities: ['brawler_soul', 'zen_mind'],
        desc: 'A novice of the old temples. It chants all day, mostly about the rules, and it knows every one of them.',
        learn: '1 palm_strike, 1 pout, 4 quick_jab, 8 holy_mace, 12 one_inch_punch, 16 mantra, 20 palm_strike, 24 burning_rave, 28 combo_chain, 32 big_shot' },
      yevomog_warrior_monk: { moogle: 'Yevomog', job: 'e6_warrior_monk', type2: 'machinist', base: B(80, 100, 75, 45, 60, 70), rate: 75, exp: 150, curve: 'medium',
        fur: '#f2ece0', pom: '#c8a040', habitat: 'town', rarity: 'common', abilities: ['brawler_soul', 'zen_mind'],
        desc: 'A temple guard with a rifle and a flamethrower. It swears the forbidden machina are allowed for holy work.',
        learn: '24 big_shot, 27 perfect_counter, 30 rivet_gun, 34 one_inch_punch, 38 wildfire_oil, 42 rivet_gun, 46 six_sided_star' },

      // ---- Crusapom: the Crusaders (Warrior > Warrior/Knight), beach
      crusapom_recruit: { moogle: 'Crusapom', job: 'e6_recruit', base: B(55, 65, 55, 25, 40, 45), rate: 180, exp: 58, curve: 'medium', evo: { at: 22, to: 'crusapom_crusader' },
        fur: '#f0ece4', pom: '#d03030', habitat: 'beach', rarity: 'common', abilities: ['battle_ready', 'avenger'],
        desc: 'Signed up to fight the great beast from the sea. It has a sword, a shield and an awful lot of nerve.',
        learn: '1 slash, 1 warcry, 5 shield_bash, 9 maim, 13 vengeance, 17 full_break, 21 slash, 25 shellbust_stab, 29 cleave, 33 onslaught' },
      crusapom_crusader: { moogle: 'Crusapom', job: 'e6_crusader', type2: 'knight', base: B(90, 100, 85, 35, 65, 60), rate: 75, exp: 148, curve: 'medium',
        fur: '#f0ece4', pom: '#d03030', habitat: 'beach', rarity: 'common', abilities: ['battle_ready', 'avenger'],
        desc: 'A veteran of a great battle on the beach. It never talks about that day, but it never misses a drill either.',
        learn: '22 shield_wall, 25 shellbust_stab, 28 valiant, 31 bayonet, 35 holmgang, 39 onslaught, 43 cross_slash, 46 shield_bash' },

      // ---- Zanmog: a swordsman for hire (Warrior > Warrior/Thief), cave
      zanmog_hired_blade: { moogle: 'Zanmog', job: 'e6_hired_blade', base: B(50, 70, 45, 25, 40, 60), rate: 150, exp: 62, curve: 'medium', evo: { at: 26, to: 'zanmog_yojimbo' },
        fur: '#e8e2d8', pom: '#b02828', habitat: 'cave', rarity: 'uncommon', abilities: ['iaijutsu', 'coin_up', 'spoils_of_war'],
        desc: 'A sword for hire with a big dog and a bigger fee. Pay it well and it bows. Pay it badly and it walks.',
        learn: '1 slash, 1 warcry, 4 kunai, 8 gil_toss, 12 crescent, 16 bite, 20 iai, 24 slash, 28 blade_beam, 32 coup_de_grace' },
      zanmog_yojimbo: { moogle: 'Zanmog', job: 'e6_yojimbo', type2: 'thief', base: B(70, 115, 65, 35, 55, 95), rate: 60, exp: 155, curve: 'medium',
        fur: '#e8e2d8', pom: '#b02828', habitat: 'cave', rarity: 'uncommon', abilities: ['iaijutsu', 'coin_up', 'spoils_of_war'],
        desc: 'Fights anything for gil. For a truly enormous fee it cuts the foe down in one stroke. No refunds.',
        learn: '26 coup_de_grace, 30 gil_toss, 34 turn_the_blade, 38 kunai, 42 zantetsu, 46 oblivion' },

      // ---- Furymog: the doll mage of the frozen woods (Black Mage > Black Mage/Summoner), snow
      furymog_doll_mage: { moogle: 'Furymog', job: 'e6_doll_mage', base: B(45, 25, 40, 65, 65, 45), rate: 150, exp: 60, curve: 'medium', evo: { at: 25, to: 'furymog_fury_mage' },
        fur: '#f0ecf0', pom: '#8a2a6a', habitat: 'snow', rarity: 'uncommon', abilities: ['mana_surge', 'magic_eater'],
        desc: 'Casts its spells through a stuffed moogle doll. Yes, a moogle with a moogle doll. It finds this quite normal.',
        learn: '1 blizzard, 1 spook, 4 fire, 8 drain, 12 blizzara, 16 haunt, 20 thunder, 24 fire, 28 triplecast, 32 fira' },
      furymog_fury_mage: { moogle: 'Furymog', job: 'e6_fury_mage', type2: 'summoner', base: B(70, 35, 60, 105, 100, 60), rate: 60, exp: 152, curve: 'medium',
        fur: '#f0ecf0', pom: '#8a2a6a', habitat: 'snow', rarity: 'uncommon', abilities: ['mana_surge', 'magic_eater'],
        desc: 'Its doll flings spells faster than the eye can follow. It haunts the crystal woods by a frozen lake.',
        learn: '25 triplecast, 28 demi_spell, 31 aspir, 34 blizzard, 38 blizzaga, 42 flare, 46 haunt' },

      // ---- Leashpom: the Calm Lands' trainers and the beastmasters (Beast > Beast/Ranger), grass
      leashpom_trainer: { moogle: 'Leashpom', job: 'e6_trainer', base: B(55, 60, 50, 30, 40, 50), rate: 190, exp: 56, curve: 'fast', evo: { at: 22, to: 'leashpom_beastlord' },
        fur: '#f2e8d8', pom: '#d07030', habitat: 'grass', rarity: 'common', abilities: ['charm', 'apex_predator'],
        desc: 'Trains a bird, a dog and a monkey, who mostly train it. It enters all three in the arena on the plains.',
        learn: '1 lasso, 1 roar, 4 bite, 8 whip_crack, 12 snare_line, 16 paw_swat, 20 lasso, 24 web_snare, 28 nimble_pounce, 32 stampede' },
      leashpom_beastlord: { moogle: 'Leashpom', job: 'e6_beastlord', type2: 'ranger', base: B(80, 95, 75, 40, 60, 85), rate: 80, exp: 146, curve: 'fast',
        fur: '#f2e8d8', pom: '#d07030', habitat: 'grass', rarity: 'common', abilities: ['charm', 'apex_predator'],
        desc: 'Tames fiends with a whistle and a jug of something smelly. Its pets would follow it anywhere, even into battle.',
        learn: '22 repelling_shot, 25 naga_fang, 28 wildcat_swipes, 31 spider_silk, 34 sidewinder, 38 behemoth_roar, 42 wildcat_swipes, 46 feral_frenzy' },

      // ---- Hearthmog: the Mog House and the Mog Garden (Freelancer > Freelancer/Beast), town
      hearthmog_housekeeper: { moogle: 'Hearthmog', job: 'e6_housekeeper', base: B(60, 50, 50, 35, 50, 45), rate: 160, exp: 60, curve: 'fast', evo: { at: 20, to: 'hearthmog_mog_gardener' },
        fur: '#f8f2ea', pom: '#ff4a5a', habitat: 'town', rarity: 'uncommon', abilities: ['healing_pom', 'auto_potion', 'fast_learner'],
        desc: "Keeps an adventurer's room tidy and their storage full. It sweeps, it dusts, and it judges your furniture.",
        learn: '1 broom_sweep, 1 snack_break, 4 pom_bop, 8 wet_floor, 12 mog_guard, 16 mop_up, 20 broom_sweep, 24 pom_dust, 28 mognet_relay, 32 acorn' },
      hearthmog_mog_gardener: { moogle: 'Hearthmog', job: 'e6_mog_gardener', type2: 'beast', base: B(95, 75, 80, 50, 80, 50), rate: 70, exp: 150, curve: 'fast',
        fur: '#f8f2ea', pom: '#ff4a5a', habitat: 'town', rarity: 'uncommon', abilities: ['healing_pom', 'auto_potion', 'fast_learner'],
        desc: 'Moved its whole household out to a garden on a quiet island. It grows nuts, goes fishing and naps in the sun.',
        learn: '20 tanglevine, 23 acorn, 26 wellspring, 29 snack_break, 32 topiary, 36 broom_sweep, 40 pom_dust, 44 mop_up' },

      // ---- Jackpom: the sphere hunter's dresspheres (Thief > Thief/Bard), night
      jackpom_sphere_hunter: { moogle: 'Jackpom', job: 'e6_sphere_hunter', base: B(45, 60, 40, 35, 40, 70), rate: 170, exp: 58, curve: 'medium', evo: { at: 24, to: 'jackpom_lady_luck' },
        fur: '#f6efe2', pom: '#f0c030', habitat: 'night', rarity: 'uncommon', abilities: ['kupo_luck', 'lucky_star'],
        desc: 'Hunts old spheres all over the world for its crew. It finds treasure and loses socks at about the same rate.',
        learn: '1 steal, 1 trip, 4 dice, 8 trick_attack, 12 steal_heart, 16 thievery, 20 dice, 24 coup_de_grace, 28 shift_break, 32 jackpot' },
      jackpom_lady_luck: { moogle: 'Jackpom', job: 'e6_lady_luck', type2: 'bard', base: B(65, 95, 60, 50, 55, 105), rate: 70, exp: 150, curve: 'medium',
        fur: '#f6efe2', pom: '#f0c030', habitat: 'night', rarity: 'uncommon', abilities: ['kupo_luck', 'lucky_star'],
        desc: 'Rolls dice, spins wheels and wins far too often. Every casino has its picture pinned up behind the counter.',
        learn: '24 jackpot, 27 cymbal_crash, 30 dice, 34 love_sonata, 38 coup_de_grace, 42 dice, 46 jackpot' },

      // ---- Mithpom: the Mithra (Thief > Thief/Black Mage), forest
      mithpom_mithra_scout: { moogle: 'Mithpom', job: 'e6_mithra_scout', base: B(45, 60, 40, 35, 35, 70), rate: 180, exp: 57, curve: 'medium', evo: { at: 23, to: 'mithpom_shinobi' },
        fur: '#f0e2cc', pom: '#c06030', habitat: 'forest', rarity: 'common', abilities: ['sneak_attack', 'speed_plus'],
        desc: 'Quick as a cat and just as nosy. It swears its cat ears are real, and nobody is brave enough to check.',
        learn: '1 mug, 1 trip, 4 quickhit, 8 viper_fang, 12 smoke, 16 kunai, 20 trick_attack, 24 katon, 28 mug, 32 shuriken' },
      mithpom_shinobi: { moogle: 'Mithpom', job: 'e6_shinobi', type2: 'blackmage', base: B(65, 100, 55, 55, 50, 105), rate: 70, exp: 150, curve: 'medium',
        fur: '#f0e2cc', pom: '#c06030', habitat: 'forest', rarity: 'common', abilities: ['sneak_attack', 'speed_plus'],
        desc: 'Leaves paper copies of itself about to take the hits. Count its shadows twice; one of them is a decoy.',
        learn: '23 bunshin, 26 katon, 29 kunai, 32 makibishi, 35 huton, 38 quickhit, 42 shuriken, 46 throw' },

      // ---- Automog: the puppetmaster and its automaton (Machinist > Machinist/Monk), factory
      automog_harlequin: { moogle: 'Automog', job: 'e6_harlequin', base: B(55, 60, 55, 30, 40, 45), rate: 160, exp: 60, curve: 'medium', evo: { at: 24, to: 'automog_puppetmaster' },
        fur: '#ece8e2', pom: '#e0c040', habitat: 'factory', rarity: 'uncommon', abilities: ['overheat', 'iron_fist'],
        desc: 'A robot moogle that built a robot of its own. The little automaton copies every move it makes, badly.',
        learn: '1 gizmo, 1 marionette, 4 kick, 8 big_shot, 12 automaton, 16 gizmo, 20 rocket_punch, 24 oil_change, 28 combo_chain, 32 drill' },
      automog_puppetmaster: { moogle: 'Automog', job: 'e6_puppetmaster', type2: 'monk', base: B(80, 95, 80, 40, 60, 70), rate: 70, exp: 148, curve: 'medium',
        fur: '#ece8e2', pom: '#e0c040', habitat: 'factory', rarity: 'uncommon', abilities: ['overheat', 'iron_fist'],
        desc: 'Fights hand to hand beside its automaton. When the pair of them overheat, they go completely wild.',
        learn: '24 piston_punch, 27 combo_chain, 30 one_inch_punch, 33 gyro_grinder, 36 gizmo, 40 asuran_fists, 44 automaton' },

      // ---- Rollmog: the corsairs (Ranger > Ranger/Thief), sea
      rollmog_sea_dog: { moogle: 'Rollmog', job: 'e6_sea_dog', base: B(50, 60, 45, 35, 40, 55), rate: 170, exp: 58, curve: 'medium', evo: { at: 25, to: 'rollmog_corsair' },
        fur: '#f0ece4', pom: '#2a4a8a', habitat: 'sea', rarity: 'uncommon', abilities: ['e6_phantom_roll', 'marksman'],
        desc: 'Swabs decks, ties knots and bets its pay on dice games below deck. It is much better at the knots.',
        learn: '1 snap_shot, 1 aim, 4 cutlass, 8 leg_shot, 12 dice, 16 musket, 20 snap_shot, 24 dark_shot, 28 twin_shot, 32 powder_keg' },
      rollmog_corsair: { moogle: 'Rollmog', job: 'e6_corsair', type2: 'thief', base: B(70, 95, 65, 50, 55, 90), rate: 70, exp: 150, curve: 'medium',
        fur: '#f0ece4', pom: '#2a4a8a', habitat: 'sea', rarity: 'uncommon', abilities: ['e6_phantom_roll', 'marksman'],
        desc: 'Rolls a phantom die before every fight. Lucky rolls make it fearsome; unlucky ones make it fearsome anyway.',
        learn: '25 plunder, 28 buckshot, 31 twin_shot, 34 arm_shot, 37 dice, 41 broadside, 45 dark_shot' },

      // ---- Luopom: the geomancers (Beast > Beast/Time Mage), volcano
      luopom_bellringer: { moogle: 'Luopom', job: 'e6_bellringer', base: B(50, 30, 50, 60, 55, 40), rate: 160, exp: 60, curve: 'medium', evo: { at: 25, to: 'luopom_luopan_sage' },
        fur: '#e8eedc', pom: '#40d0b0', habitat: 'volcano', rarity: 'uncommon', abilities: ['mako_spring', 'time_compression', 'gravitas'],
        desc: "Rings a little bell to wake the land's own magic. The rocks hum along when it gets the note just right.",
        learn: '1 starlight, 1 roar, 4 geomancy, 8 wellspring, 12 dig_up, 16 whisker_blast, 20 slowga, 24 starlight, 28 dust_devil, 32 geomancy' },
      luopom_luopan_sage: { moogle: 'Luopom', job: 'e6_luopan_sage', type2: 'timemage', base: B(75, 45, 75, 95, 85, 55), rate: 65, exp: 150, curve: 'medium',
        fur: '#e8eedc', pom: '#40d0b0', habitat: 'volcano', rarity: 'uncommon', abilities: ['mako_spring', 'time_compression', 'gravitas'],
        desc: 'Plants a floating compass in the ground and the whole field changes to suit it. Hot springs follow it about.',
        learn: '25 chronosphere, 28 gravity, 31 demi_spell, 34 starlight, 38 graviga, 42 whisker_blast, 46 geomancy' },

      // ---- Glyphmog: the rune fencers (Red Mage > Red Mage/Knight), mountain
      glyphmog_rune_scribe: { moogle: 'Glyphmog', job: 'e6_rune_scribe', base: B(55, 35, 60, 50, 60, 30), rate: 150, exp: 62, curve: 'medium', evo: { at: 26, to: 'glyphmog_rune_fencer' },
        fur: '#eceff4', pom: '#60c0ff', habitat: 'mountain', rarity: 'uncommon', abilities: ['runic', 'stand_firm'],
        desc: 'Carves glowing runes into anything that holds still for long enough. Its own pom is covered in tiny lettering.',
        learn: '1 jolt, 1 en_garde, 4 verstone, 8 mind_blast, 12 magick_barrier, 16 jolt, 20 spellstrike, 24 contre_sixte, 28 verstone, 32 dispel_spell' },
      glyphmog_rune_fencer: { moogle: 'Glyphmog', job: 'e6_rune_fencer', type2: 'knight', base: B(85, 50, 90, 80, 90, 35), rate: 60, exp: 152, curve: 'medium',
        fur: '#eceff4', pom: '#60c0ff', habitat: 'mountain', rarity: 'uncommon', abilities: ['runic', 'stand_firm'],
        desc: 'Wards itself with runes and swings a great sword. Spells that hit it tend to fizzle and look embarrassed.',
        learn: '26 rune_blade, 29 verstone, 32 sheltron, 35 aegis_slam, 38 challenge, 42 jolt, 46 rune_blade' },

      // ---- Waltzkin: the dancer and the songstress (Bard > Bard/Summoner), town
      waltzkin_waltzer: { moogle: 'Waltzkin', job: 'e6_waltzer', base: B(50, 35, 40, 55, 50, 60), rate: 170, exp: 58, curve: 'fast', evo: { at: 24, to: 'waltzkin_songstress' },
        fur: '#f8eef0', pom: '#ff60a0', habitat: 'town', rarity: 'uncommon', abilities: ['sylph_dance', 'opening_act'],
        desc: 'Its waltzes mend scrapes and its sambas steal a little HP back. It never walks anywhere; it only dances.',
        learn: '1 sonic_chord, 1 love_sonata, 4 snowman_jazz, 8 sylph_breeze, 12 sonic_chord, 16 dusk_requiem, 20 moonlit_waltz, 24 crescendo, 28 high_note, 32 wind_song' },
      waltzkin_songstress: { moogle: 'Waltzkin', job: 'e6_songstress', type2: 'summoner', base: B(70, 45, 60, 90, 75, 90), rate: 70, exp: 150, curve: 'fast',
        fur: '#f8eef0', pom: '#ff60a0', habitat: 'town', rarity: 'uncommon', abilities: ['sylph_dance', 'opening_act'],
        desc: 'Sings to a packed stadium by the sea. Lights rise from the crowd like pyreflies whenever it hits the high note.',
        learn: '24 drop_the_beat, 27 leaf_gust, 30 high_note, 33 ectoplasm, 36 wind_song, 40 crescendo, 44 living_muse, 48 aria' },

      // ---- Faythpom: the dreaming fayth and their Aeons (Time Mage > Summoner/Time Mage), sky
      faythpom_fayth: { moogle: 'Faythpom', job: 'e6_fayth', base: B(50, 30, 45, 65, 60, 50), rate: 150, exp: 64, curve: 'slow', evo: { at: 28, to: 'faythpom_aeon' },
        fur: '#eef2fa', pom: '#c04050', wing: '#e8c050', habitat: 'sky', rarity: 'rare', abilities: ['quickcast', 'esper_eater'],
        desc: 'A soul asleep inside a temple statue, dreaming of a city by the sea. It talks in its sleep, in old songs.',
        learn: '1 starshower, 1 pom_dust, 4 haunt, 8 premonition, 12 rewind_time, 16 starshower, 20 comet, 24 weightless, 28 haunt, 32 moonbeam' },
      faythpom_aeon: { moogle: 'Faythpom', job: 'e6_aeon', type2: 'timemage', base: B(80, 55, 70, 105, 90, 80), rate: 60, exp: 160, curve: 'slow',
        fur: '#eef2fa', pom: '#c04050', wing: '#e8c050', habitat: 'sky', rarity: 'rare', abilities: ['quickcast', 'esper_eater'],
        desc: "The fayth's dream, given wings. It sweeps down out of the sky when it is called, and leaves when it is thanked.",
        learn: '28 aerial_blast, 31 haste, 34 moonbeam, 37 starshower, 41 eternal_breath, 45 meteor' },

      // ---- Skiffmog: the airships (Machinist > Machinist/Dragoon), sky
      skiffmog_rigger: { moogle: 'Skiffmog', job: 'e6_rigger', base: B(50, 60, 50, 30, 40, 55), rate: 180, exp: 57, curve: 'medium', evo: { at: 22, to: 'skiffmog_airship_pilot' },
        fur: '#f0ece6', pom: '#e08030', habitat: 'sky', rarity: 'common', abilities: ['pom_wings', 'auto_haste'],
        desc: "Keeps the airship's engines oiled and its own fur greasy. It waves at every bird it passes.",
        learn: '1 wrench, 1 pout, 4 rivet_gun, 8 air_anchor, 12 big_shot, 16 wrench, 20 swap_parts, 24 rocket_punch, 28 rivet_gun, 32 kupo_missile' },
      skiffmog_airship_pilot: { moogle: 'Skiffmog', job: 'e6_airship_pilot', type2: 'dragoon', base: B(70, 95, 65, 40, 55, 105), rate: 75, exp: 146, curve: 'medium',
        fur: '#f0ece6', pom: '#e08030', habitat: 'sky', rarity: 'common', abilities: ['pom_wings', 'auto_haste'],
        desc: 'Flies the airships between the great cities. It can land on a cloud, but it would rather use the runway.',
        learn: '22 dive_bomb, 25 tailwind, 28 hurdle, 31 wyrmwind, 34 air_anchor, 38 rivet_gun, 42 satellite_beam, 46 highwind' },

      // ---- Azurepom: the blue mage Immortals (Red Mage > Red Mage/Beast), ruins
      azurepom_azure_adept: { moogle: 'Azurepom', job: 'e6_azure_adept', base: B(50, 45, 45, 60, 45, 50), rate: 150, exp: 62, curve: 'medium', evo: { at: 26, to: 'azurepom_immortal' },
        fur: '#e8eef8', pom: '#2a5ab0', habitat: 'ruins', rarity: 'uncommon', abilities: ['blue_learning', 'hex', 'limit_break'],
        desc: 'Learns its spells by being hit by monsters. It is covered in bruises and very proud of every one.',
        learn: '1 goblin_punch, 1 pout, 4 mind_blast, 8 white_wind, 12 jolt, 16 aqua_breath, 20 bad_breath, 24 goblin_punch, 28 limit_glove, 32 whisker_blast' },
      azurepom_immortal: { moogle: 'Azurepom', job: 'e6_immortal', type2: 'beast', base: B(75, 65, 65, 95, 65, 80), rate: 65, exp: 152, curve: 'medium',
        fur: '#e8eef8', pom: '#2a5ab0', habitat: 'ruins', rarity: 'uncommon', abilities: ['blue_learning', 'hex', 'limit_break'],
        desc: "An elite of the desert empire, dressed in scraps of the beasts whose skills it learned. Its eyes glow blue.",
        learn: '26 whisker_blast, 29 tanglevine, 32 limit_glove, 35 goblin_punch, 39 ochu_spores, 43 aqua_breath, 47 whisker_blast' },

      // ---- one-stage moogles
      avatamog_avatar_caller: { moogle: 'Avatamog', job: 'e6_avatar_caller', type2: 'whitemage', base: B(70, 40, 70, 105, 100, 95), rate: 60, exp: 170, curve: 'medium',
        fur: '#f2f0f8', pom: '#e02050', habitat: 'volcano', rarity: 'rare', abilities: ['auto_reflect', 'summon_bond'],
        desc: 'Calls its avatars down in a blaze of ruby light. A small creature with a red gem on its brow never leaves its side.',
        learn: '1 leaf_gust, 1 ruby_light, 5 searing_light, 9 holy_glare, 13 reflect_spell, 17 aerial_blast, 21 leaf_gust, 25 hellfire, 29 diamond_dust, 33 haunt, 37 judgment_bolt, 41 cura, 45 holy_glare, 48 earthen_fury' },
      gysamog_choco_digger: { moogle: 'Gysamog', job: 'e6_choco_digger', type2: 'thief', base: B(75, 85, 70, 35, 60, 95), rate: 120, exp: 150, curve: 'fast',
        fur: '#f8ecc0', pom: '#f0c020', wing: '#d8a030', habitat: 'desert', rarity: 'common', abilities: ['coin_up', 'speed_plus'],
        desc: 'Its chocobo digs up treasure whenever it is fed greens. It has found nuts, gil and, once, its own lost hat.',
        learn: '1 choco_kick, 1 quicksand, 4 steal, 8 underhand, 12 paw_swat, 16 choco_kick, 20 dust_devil, 24 nimble_pounce, 28 pilfer, 32 chocobo_rush, 36 thievery, 40 choco_kick, 44 choco_meteor, 48 gaia_rage' },
      mogsuit_mascot: { moogle: 'Mogsuit', job: 'e6_mascot', type2: 'bard', base: B(85, 60, 70, 55, 70, 60), rate: 100, exp: 155, curve: 'fast',
        fur: '#fbf8f4', pom: '#ff3040', wing: '#b04ad8', habitat: 'cave', rarity: 'uncommon', abilities: ['e6_moogle_suit', 'charm'],
        desc: 'A moogle in a moogle suit. The suit is bigger, fluffier and, frankly, far more popular than the moogle inside.',
        learn: '1 pom_bop, 1 peekaboo, 4 love_sonata, 8 pom_flurry, 12 heckle_riff, 16 mog_guard, 20 kupo_holler, 24 pom_bop, 28 cymbal_crash, 32 mognet_relay, 36 cake_toss, 40 pom_flurry, 44 wind_song, 48 kupo_rush' },
    },

    // ------------------------------------------------------------------ the Kupodex: line after line
    dex: [
      'pilgrimog_apprentice', 'pilgrimog_pilgrim', 'pilgrimog_high_summoner',
      'aurochmog_blitz_rookie', 'aurochmog_blitzballer', 'aurochmog_blitz_ace',
      'spheremog_sphere_novice', 'spheremog_grid_walker', 'spheremog_sphere_master',
      'tarupom_star_onion', 'tarupom_arts_scholar', 'tarupom_star_sibyl',
      'grimmog_galka_guard', 'grimmog_abyss_knight', 'grimmog_shadow_lord',
      'elvamog_royal_page', 'elvamog_temple_knight', 'elvamog_royal_paladin',
      'pikepom_pikeman', 'pikepom_wyvern_rider', 'pikepom_spirit_dragoon',
      'suukma_sand_digger', 'suukma_salvager', 'suukma_machina_master',
      'pyremog_pyrefly', 'pyremog_fiend', 'pyremog_unsent',
      'gullmog_pistoleer', 'gullmog_gun_mage', 'gullmog_floral_fallal',
      'hornpom_ronso_cub', 'hornpom_ronso_lancer', 'hornpom_ronso_guardian',
      'minuemog_balladeer', 'minuemog_troubadour', 'minuemog_virtuoso',
      'yevomog_temple_novice', 'yevomog_warrior_monk',
      'crusapom_recruit', 'crusapom_crusader',
      'zanmog_hired_blade', 'zanmog_yojimbo',
      'furymog_doll_mage', 'furymog_fury_mage',
      'leashpom_trainer', 'leashpom_beastlord',
      'hearthmog_housekeeper', 'hearthmog_mog_gardener',
      'jackpom_sphere_hunter', 'jackpom_lady_luck',
      'mithpom_mithra_scout', 'mithpom_shinobi',
      'automog_harlequin', 'automog_puppetmaster',
      'rollmog_sea_dog', 'rollmog_corsair',
      'luopom_bellringer', 'luopom_luopan_sage',
      'glyphmog_rune_scribe', 'glyphmog_rune_fencer',
      'waltzkin_waltzer', 'waltzkin_songstress',
      'faythpom_fayth', 'faythpom_aeon',
      'skiffmog_rigger', 'skiffmog_airship_pilot',
      'azurepom_azure_adept', 'azurepom_immortal',
      'avatamog_avatar_caller', 'gysamog_choco_digger', 'mogsuit_mascot',
    ],
  });
})();

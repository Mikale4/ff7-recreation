// Kupomon expansion: the legends (docs/KUPOMON_CONTENT.md; their sidequests: docs/KUPOMON_LEGENDS.md). Four new
// legendaries and six mythicals from the whole Final Fantasy moogle mythos, each met once at the end of its own quest:
//   legends:   Mogglemog (a Good King and his Pom Court, after FF14's moogle primal), Tempomog (the time-hopping moogle
//              of FFXIII-2), Luxmog (a moogle Warrior of Light), Montblanc (the clan leader of FFTA and FF12)
//   mythicals: Stiltzkin (FF9's and Crystal Chronicles' travelling moogle), Dr. Mog (Record Keeper's scholar), Fatepom
//              (a pom of destiny), Hurdygurdy (Montblanc's brothers Hurdy and Gurdy, bard and map-seller, in one
//              coat), Kupofried (FFXI's king of the moogles, here a dream king), Chalimog (the moogle who carries
//              Crystal Chronicles' chalice)
// Each has its own job and look, a signature move (lg_) and a signature ability (a legend: true one from
// kp_c01_abilities.js, or its own lg_ one) first in its list. Our own words throughout.
(function () {
  const KP = FF7.kupomon;
  KP.content('legends', {
    // ------------------------------------------------------------------ the jobs (legends get the grand look on top)
    jobs: {
      lg_good_king: { name: 'Good King', type: 'summoner', look: { hat: 'horncrown', body: 'mantle', weapon: 'bell', extra: ['halo'], g1: '#f2cfe2', g2: '#f0c030' } },
      lg_time_hopper: { name: 'Time Hopper', type: 'timemage', look: { hat: 'clockhat', body: 'starcoat', weapon: 'runesword', extra: ['wisps'], g1: '#4a3a9a', g2: '#e8c040', glow: '#80e8ff' } },
      lg_light_warrior: { name: 'Light Warrior', type: 'whitemage', look: { hat: 'saintband', body: 'plate', weapon: 'excalibur', shield: 'kite', cape: '#2a4ab0', extra: ['halo'], g1: '#e8ecf6', g2: '#d8b040' } },
      lg_clan_leader: { name: 'Clan Leader', type: 'blackmage', look: { hat: 'feathercap', body: 'longcoat', weapon: 'orbstaff', g1: '#a02838', g2: '#f0c040' } },
      lg_globetrotter: { name: 'Globetrotter', type: 'freelancer', look: { hat: 'explorer', body: 'backpack', weapon: 'walkstaff', g1: '#7a5a3a', g2: '#3a8a4a' } },
      lg_record_keeper: { name: 'Record Keeper', type: 'redmage', look: { hat: 'monocle', body: 'coat', weapon: 'grimoire', g1: '#f0f0f4', g2: '#3a6ab0' } },
      lg_pom_of_destiny: { name: 'Pom of Destiny', type: 'freelancer', look: { hat: 'coinscarf', body: 'fringe', weapon: 'cards', extra: ['wisps'], g1: '#8a2a8a', g2: '#f0c040' } },
      lg_twin_minstrels: { name: 'Twin Minstrels', type: 'bard', look: { hat: 'harmonica', body: 'tailcoat', weapon: 'harp', g1: '#3a6a3a', g2: '#e8c040' } },
      lg_dream_king: { name: 'Dream King', type: 'summoner', look: { hat: 'nightcap', body: 'royal', weapon: 'moonstaff', extra: ['wisps'], g1: '#2a2a6a', g2: '#e8d070' } },
      lg_chalice_bearer: { name: 'Chalice Bearer', type: 'dragoon', look: { hat: 'dragonhelm', body: 'scale', weapon: 'starglobe', shield: 'round', g1: '#2a6ab0', g2: '#e0f0ff' } },
    },

    // ------------------------------------------------------------------ the signature moves (sig: one kind learns each)
    moves: {
      lg_pom_court: { name: 'Pom Court', type: 'summoner', power: 22, acc: 90, cd: 2, hits: 5, fx: 'summon_choco_mog', sig: true,
        desc: 'Its loyal Pom Court piles in, one moogle at a time: five hits.' },
      lg_mog_clock: { name: 'Mog Clock', type: 'timemage', power: 40, acc: 100, cd: 2, prio: 3, firstTurnOnly: true, status: ['stop', 100], fx: 'stop', sig: true,
        desc: "Only on its first turn out: strikes first and Stops the foe's clock." },
      lg_dawn_blade: { name: 'Dawn Blade', type: 'whitemage', cat: 'physical', power: 140, acc: 100, cd: 2, charge: { text: 'raised its blade to catch the light!', skipIn: 'radiance' },
        flags: ['contact', 'slice'], fx: 'limit_braver', sig: true, desc: 'Gathers the dawn in its blade, then strikes. No charging in Radiance.' },
      lg_mana_gale: { name: 'Mana Gale', type: 'blackmage', power: 95, acc: 100, cd: 2, weather: 'manastorm', clearHazards: 'all', flags: ['wind'], fx: 'tornado', sig: true,
        desc: 'A howling mana storm: blows away every hazard and wall. Manastorm.' },
      lg_onward_kupo: { name: 'Onward, Kupo!', type: 'freelancer', power: 70, acc: 100, cd: 2, side: 'tailwind', selfSwitch: true, flags: ['contact'], sig: true,
        desc: 'Strikes, then sets off down the road, leaving a tailwind behind.' },
      lg_lecture: { name: 'Lecture', type: 'redmage', power: 0, acc: true, cd: 3, self: { mag: 1, res: 1, spd: 1 }, cureTeam: true, sig: true,
        desc: "A brisk lesson: its team's ailments cured; Magic, Res, Speed up." },
      lg_fated_hour: { name: 'Fated Hour', type: 'thief', power: 0, acc: 100, cd: 3, status: ['doom', 100], flags: ['sound'], fx: 'death', sig: true,
        desc: 'A bell tolls for the foe alone: it is Doomed, and faints in 3 turns.' },
      lg_duet_strike: { name: 'Duet Strike', type: 'monk', power: 85, acc: 100, cd: 2, status: ['confuse', 20], flags: ['contact', 'punch', 'sound'], sig: true,
        desc: 'One twin sings while the other swings. May leave the foe Confused.' },
      lg_dream_feast: { name: 'Dream Feast', type: 'summoner', power: 75, acc: 100, cd: 2, drain: 0.5, powerBy: 'targetStatus', fx: 'osmose', sig: true,
        desc: "Feeds on the foe's dreams: x2 on an ailing foe; heals half of it." },
      lg_myrrh_ward: { name: 'Myrrh Ward', type: 'dragoon', power: 0, acc: true, cd: 3, heal: 0.5, cures: ['poison', 'venom', 'burn', 'blind', 'silence', 'slow', 'zombie', 'mini'],
        side: 'safeguard', sig: true, desc: 'Lifts the crystal chalice: heals 50%, cures it, wards its side.' },
    },

    // ------------------------------------------------------------------ their own abilities (the rest are kp_c01's legend ones)
    abilities: {
      lg_kupo_anthem: { name: 'Kupo Anthem', desc: 'Starts a Rhythm Field as it comes out; Magic 1.3x on one.', setTerrain: 'rhythm', fieldStat: { rhythm: { mag: 1.3 } },
        announce: 'is attended by its loyal Pom Court!', legend: true },
      lg_time_hop: { name: 'Time Hop', desc: "Acts first the turn it comes out; can't be Stopped or Slowed.", firstStrike: true, noStatus: ['stop', 'slow'], legend: true },
      lg_well_traveled: { name: 'Well Traveled', desc: "Heals 1/3 of its HP when it switches out; it can't be Slowed.", regenerator: 1 / 3, noStatus: ['slow'], legend: true },
    },

    // ------------------------------------------------------------------ the species
    species: {
      // ---- legends (Lv 50, each the end of a post-League quest: docs/KUPOMON_LEGENDS.md)
      mogglemog_good_king: {
        moogle: 'Mogglemog', job: 'lg_good_king', type2: 'bard', class: 'legend',
        base: { hp: 110, atk: 70, def: 95, mag: 135, res: 120, spd: 100 },   // 630: a royal caster behind its court
        rate: 3, exp: 320, curve: 'slow', rarity: 'none', habitat: 'forest',
        fur: '#fff4f8', pom: '#ff5a9a', nose: '#e04070', wing: '#c8a0e0',
        desc: 'The Good King of the Pom Court, called up when enough moogles believe at once. Its subjects do the bopping for it.',
        abilities: ['lg_kupo_anthem', 'encore', 'royal_bearing'],
        learn: '1 sonic_chord, 1 sylph_breeze, 5 haunt, 9 spook, 13 searing_light, 17 drizzle, 21 high_note, 25 drop_the_beat, 29 hymn, 32 judgment_bolt, 35 moonlit_waltz, 38 crescendo, 41 thundara, 44 lg_pom_court, 47 aria, 50 sonic_chord',
        found: 'The Pom Court, Whisperwood Deep (a sidequest)',
      },
      tempomog_time_hopper: {
        moogle: 'Tempomog', job: 'lg_time_hopper', type2: 'warrior', class: 'legend',
        base: { hp: 95, atk: 125, def: 85, mag: 120, res: 85, spd: 130 },   // 640: fast, hits from both sides
        rate: 3, exp: 320, curve: 'slow', rarity: 'none', habitat: 'night',
        fur: '#f4f2ff', pom: '#ff5050', nose: '#e04050', wing: '#6a5ac0',
        desc: 'Hops between yesterday and tomorrow on a ticking pendant. It once stopped a whole clock tower to finish a nap.',
        abilities: ['lg_time_hop', 'quickcast', 'sure_hit'],
        learn: '1 tick_tock, 1 haste, 5 slash, 9 slow, 13 gravity, 17 second_hand, 21 maim, 25 cross_slash, 29 starlight, 32 comet, 35 rewind_time, 38 tick_tock, 41 fell_cleave, 44 lg_mog_clock, 47 graviga, 50 second_hand',
        found: "Ravenmoor's clock tower, at midnight (a sidequest)",
      },
      luxmog_light_warrior: {
        moogle: 'Luxmog', job: 'lg_light_warrior', type2: 'knight', class: 'legend',
        base: { hp: 110, atk: 140, def: 120, mag: 80, res: 105, spd: 95 },   // 650: a heavy blade in heavy plate
        rate: 3, exp: 320, curve: 'slow', rarity: 'none', habitat: 'sky',
        fur: '#fbfaf4', pom: '#ffe060', nose: '#e85a5a', wing: '#d8c8f0',
        desc: 'A knight of the first light, carrying the dawn in its blade. Wherever it stands, the sun quietly refuses to set.',
        abilities: ['eternal_dawn', 'light_crystal'],
        learn: '1 shield_bash, 1 cure, 5 holy_mace, 9 protect, 13 keen_edge, 17 valiant, 21 dawn_prayer, 25 slash, 28 cleansing_strike, 31 sentinel, 34 tomahawk, 37 braver, 41 lg_dawn_blade, 45 saint_cross, 50 keen_edge',
        found: "The Shrine of Light, off the Champion's Bridge (a sidequest)",
      },
      montblanc_clan_leader: {
        moogle: 'Montblanc', job: 'lg_clan_leader', type2: 'beast', class: 'legend',
        base: { hp: 100, atk: 85, def: 90, mag: 140, res: 100, spd: 115 },   // 630: a quick storm-caller
        rate: 3, exp: 320, curve: 'slow', rarity: 'none', habitat: 'town',
        fur: '#f8f2f2', pom: '#ff3a3a', nose: '#d03050', wing: '#8a3ab0',
        desc: 'Leader of Clan Kupo, mage and hunter both. It pins bounties on the board and quietly keeps the best ones for itself.',
        abilities: ['mana_maelstrom', 'zodiac_brave'],
        learn: '1 fire, 1 roar, 5 ice_chisel, 9 spore, 13 thunder, 17 hot_coal, 21 geomancy, 25 blizzara, 29 ley_lines, 32 zap, 35 astral_fire, 38 whisker_blast, 41 scathe, 44 lg_mana_gale, 47 aqua_breath',
        found: 'Clan Kupo, Kupo Coliseum (a sidequest)',
      },
      // ---- mythicals (Lv 45-50, each behind a feat: docs/KUPOMON_LEGENDS.md)
      stiltzkin_globetrotter: {
        moogle: 'Stiltzkin', job: 'lg_globetrotter', type2: 'ranger', class: 'mythical',
        base: { hp: 95, atk: 105, def: 85, mag: 75, res: 95, spd: 145 },   // 600: never stays put
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'grass',
        fur: '#f4ecdc', pom: '#ff4040', nose: '#e05050', wing: '#a07040',
        desc: 'A moogle on a very long walk. It turns up in a new town each day with a bundle to sell, and the price keeps going up.',
        abilities: ['lg_well_traveled', 'coin_up'],
        learn: '1 pom_bop, 1 snack_break, 5 arrow, 9 trip, 13 dash, 17 snap_shot, 21 twin_arrow, 25 trailblaze, 29 errand_run, 32 hunters_mark, 35 cutlass, 38 katon, 41 sharpshot, 44 lg_onward_kupo, 47 buckshot',
        found: 'The Old Oak, Route 1, at sunset (a sidequest)',
      },
      drmog_record_keeper: {
        moogle: 'Dr. Mog', job: 'lg_record_keeper', type2: 'timemage', class: 'mythical',
        base: { hp: 90, atk: 60, def: 95, mag: 130, res: 120, spd: 105 },   // 600: a patient, bookish caster
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'town',
        fur: '#fffaf0', pom: '#ff6aa0', nose: '#e05a7a', wing: '#9ab0d8',
        desc: 'Keeper of the Record, a whole library folded into one book. It grades every battle it watches, rarely above a B.',
        abilities: ['chrono_engine', 'libra', 'fast_learner'],
        learn: '1 jolt, 1 slow, 5 tick_tock, 9 miasma, 13 dualcast, 17 starlight, 21 broil, 25 old_spell, 29 card_trick, 32 adloquium, 35 resolution_spell, 38 ruin, 41 moonbeam, 44 lg_lecture, 47 verflare',
        found: "Inside a locked book in Prof. Sith's lab (a sidequest)",
      },
      fatepom_pom_of_destiny: {
        moogle: 'Fatepom', job: 'lg_pom_of_destiny', type2: 'thief', class: 'mythical',
        base: { hp: 20, atk: 140, def: 80, mag: 110, res: 80, spd: 170 },   // 600: almost no HP; only the destined blow lands
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'sky',
        fur: '#fff0f6', pom: '#ffd040', nose: '#ff5a8a', wing: '#f0a0d0',
        desc: 'A pom-pom that fell off a lucky star. Only the one blow fate has written down can touch it; the rest pass through.',
        abilities: ['invincible', 'kupo_luck'],
        learn: '1 pom_bop, 1 pout, 5 mug, 9 trip, 13 plunder, 17 dice, 21 steal_heart, 25 coup_de_grace, 29 pom_flurry, 32 jackpot, 35 bunshin, 38 cloak_dagger, 41 shuriken, 44 lg_fated_hour, 47 earth_render, 50 dice',
        found: 'Fell from the sky over the Kupo Ranch (a sidequest)',
      },
      hurdygurdy_twin_minstrels: {
        moogle: 'Hurdygurdy', job: 'lg_twin_minstrels', type2: 'monk', class: 'mythical',
        base: { hp: 95, atk: 120, def: 85, mag: 100, res: 85, spd: 115 },   // 600: two of everything, half the patience
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'beach',
        fur: '#f6eee0', pom: '#60c0ff', nose: '#e06a5a', wing: '#5a9a5a',
        desc: 'Twin brothers sharing one big coat. One plays, one punches, and they have never once agreed on who is steering.',
        abilities: ['dual_wield', 'kupo_punk'],
        learn: '1 strum, 1 battle_song, 5 palm_strike, 9 tempt, 13 knife_juggle, 17 quick_jab, 21 high_note, 25 kiai, 29 juggle, 32 earth_render, 35 heckle_riff, 38 party_horn, 41 power_chord, 44 lg_duet_strike, 47 mic_drop, 50 quick_jab',
        found: 'Costa del Kupo, after a MogNet mix-up (a sidequest)',
      },
      kupofried_dream_king: {
        moogle: 'Kupofried', job: 'lg_dream_king', type2: 'thief', class: 'mythical',
        base: { hp: 100, atk: 75, def: 85, mag: 125, res: 95, spd: 120 },   // 600: quick, and worst when you're sleepy
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'night',
        fur: '#ecebff', pom: '#a080ff', nose: '#c05a9a', wing: '#3a3a7a',
        desc: 'A king who reigns only in dreams. It visits sleepers who have met every moogle, to hear about each one in turn.',
        abilities: ['eternal_night', 'vampirism'],
        learn: '1 drizzle, 1 smoke, 5 cloak_dagger, 9 spook, 13 ectoplasm, 17 dread_shade, 21 searing_light, 25 nightfall, 29 pilfer, 32 phantom_fade, 35 nocturne, 39 haunt, 43 nether_blaze, 47 lg_dream_feast',
        found: "In a dream, at the Champions' Rest (a sidequest)",
      },
      chalimog_chalice_bearer: {
        moogle: 'Chalimog', job: 'lg_chalice_bearer', type2: 'knight', class: 'mythical',
        base: { hp: 105, atk: 105, def: 120, mag: 70, res: 120, spd: 80 },   // 600: the wall round the crystal
        rate: 3, exp: 300, curve: 'slow', rarity: 'none', habitat: 'ruins',
        fur: '#f0f4ff', pom: '#40c0ff', nose: '#d85a7a', wing: '#80b0e0',
        desc: 'Bearer of the crystal chalice the first champions drank from. Its wings are tiny. Its shield, very much not.',
        abilities: ['crystal_aegis', 'auto_wall'],
        learn: '1 thrust, 1 cover, 5 shield_bash, 9 lancet, 13 iron_wall, 17 talon, 21 harpoon, 25 wyrmwind, 29 keen_edge, 32 stasis_sword, 35 reiss_wind, 38 pom_lance, 41 aegis_slam, 44 lg_myrrh_ward, 47 angel_wing',
        found: 'The Chalice Vault, under the Battle Square (a sidequest)',
      },
    },

    dex: [
      'mogglemog_good_king', 'tempomog_time_hopper', 'luxmog_light_warrior', 'montblanc_clan_leader',
      'stiltzkin_globetrotter', 'drmog_record_keeper', 'fatepom_pom_of_destiny', 'hurdygurdy_twin_minstrels', 'kupofried_dream_king', 'chalimog_chalice_bearer',
    ],
  });
})();

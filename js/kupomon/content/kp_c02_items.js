// Kupomon expansion: held items (docs/KUPOMON_MECHANICS.md "Held items"). Every held-item key the battle knows, in
// families: the Gems, the resist greens, the pinch and cure berries, the competitive staples, the field items, the
// signature items of a few lines and the outside-battle ones. Names are Final Fantasy homage (FF accessories and relics,
// FF7 materia, FF9 add-ons, FF12 accessories, the chocobo greens, moogle things). shop: the region whose Marts sell it
// (1 early ... 4 the endgame and after the League); find: found on the maps only.
(function () {
  const KP = FF7.kupomon;
  KP.content('items', {
    items: {
      // ------------------------------------------------------------------ the Gems (gem: x1.3 on the first attack of
      // that type, then gone)
      moonstone: { name: 'Moonstone', gem: 'freelancer', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Freelancer attack hits 30% harder.' },
      ruby: { name: 'Ruby', gem: 'warrior', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Warrior attack hits 30% harder.' },
      diamond: { name: 'Diamond', gem: 'knight', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Knight attack hits 30% harder.' },
      topaz: { name: 'Topaz', gem: 'monk', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Monk attack hits 30% harder.' },
      opal: { name: 'Opal', gem: 'thief', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Thief attack hits 30% harder.' },
      sapphire: { name: 'Sapphire', gem: 'dragoon', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Dragoon attack hits 30% harder.' },
      emerald: { name: 'Emerald', gem: 'ranger', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Ranger attack hits 30% harder.' },
      amethyst: { name: 'Amethyst', gem: 'blackmage', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Black Mage attack hits 30% harder.' },
      pearl: { name: 'Pearl', gem: 'whitemage', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first White Mage attack hits 30% harder.' },
      garnet: { name: 'Garnet', gem: 'redmage', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Red Mage attack hits 30% harder.' },
      aquamarine: { name: 'Aquamarine', gem: 'summoner', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Summoner attack hits 30% harder.' },
      lapis_lazuli: { name: 'Lapis Lazuli', gem: 'timemage', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Time Mage attack hits 30% harder.' },
      peridot: { name: 'Peridot', gem: 'bard', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Bard attack hits 30% harder.' },
      pumice: { name: 'Pumice', gem: 'beast', once: true, price: 1500, shop: 2, desc: 'Held, used up: its first Beast attack hits 30% harder.' },
      mako_shard: { name: 'Mako Shard', gem: 'machinist', once: true, price: 1500, shop: 3, desc: 'Held, used up: its first Machinist attack hits 30% harder.' },

      // ------------------------------------------------------------------ the resist greens (resistBerry: halves one
      // super-effective hit of that type). Nothing is super-effective against anything with a Freelancer move
      // (KP.CHART), so the Rolanberry is Showdown's Chilan Berry: it wants the engine's resistBerry to take any
      // Freelancer hit (kp_mech.js)
      rolanberry: { name: 'Rolanberry', resistBerry: 'freelancer', once: true, price: 400, shop: 2, desc: 'Held, used up: halves the first Freelancer hit it takes.' },
      gysahl_greens: { name: 'Gysahl Greens', resistBerry: 'warrior', once: true, price: 400, shop: 1, desc: 'Held, used up: halves one super-effective Warrior hit.' },
      krakka_root: { name: 'Krakka Root', resistBerry: 'knight', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Knight hit.' },
      tantalplant: { name: 'Tantalplant', resistBerry: 'monk', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Monk hit.' },
      pahsana_fruit: { name: 'Pahsana Fruit', resistBerry: 'thief', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Thief hit.' },
      curiel_root: { name: 'Curiel Root', resistBerry: 'dragoon', once: true, price: 400, shop: 3, desc: 'Held, used up: halves one super-effective Dragoon hit.' },
      mimett_gourd: { name: 'Mimett Gourd', resistBerry: 'ranger', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Ranger hit.' },
      wizard_eggplant: { name: 'Wizard Eggplant', resistBerry: 'blackmage', once: true, price: 400, shop: 1, desc: 'Held, used up: halves one super-effective Black Mage hit.' },
      faerie_apple: { name: 'Faerie Apple', resistBerry: 'whitemage', once: true, price: 400, shop: 1, desc: 'Held, used up: halves one super-effective White Mage hit.' },
      blood_currant: { name: 'Blood Currant', resistBerry: 'redmage', once: true, price: 400, shop: 3, desc: 'Held, used up: halves one super-effective Red Mage hit.' },
      reagan_greens: { name: 'Reagan Greens', resistBerry: 'summoner', once: true, price: 400, shop: 3, desc: 'Held, used up: halves one super-effective Summoner hit.' },
      sylkis_bud: { name: 'Sylkis Bud', resistBerry: 'timemage', once: true, price: 400, shop: 3, desc: 'Held, used up: halves one super-effective Time Mage hit.' },
      pixie_plum: { name: 'Pixie Plum', resistBerry: 'bard', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Bard hit.' },
      pamamas: { name: 'Pamamas', resistBerry: 'beast', once: true, price: 400, shop: 2, desc: 'Held, used up: halves one super-effective Beast hit.' },
      thundermelon: { name: 'Thundermelon', resistBerry: 'machinist', once: true, price: 400, shop: 3, desc: 'Held, used up: halves one super-effective Machinist hit.' },

      // ------------------------------------------------------------------ pinch berries: healing (pinchHeal) and a
      // stat rise (pinchBoost) when its HP drops low
      mamook_pear: { name: 'Mamook Pear', pinchHeal: { at: 0.5, heal: 0.25 }, once: true, price: 400, shop: 1, desc: 'Held, used up: at half HP or less, it restores 1/4 of its max HP.' },
      doman_plum: { name: 'Doman Plum', pinchHeal: { at: 0.25, heal: 1 / 3 }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, it restores 1/3 of its max HP.' },
      phoenix_pinion: { name: 'Phoenix Pinion', pinchHeal: { at: 0.25, heal: 0.5 }, once: true, price: 600, shop: 4, desc: 'Held, used up: at 1/4 HP or less, it restores half its max HP.' },
      elixir: { name: 'Elixir', pinchHeal: { at: 0.5, heal: 0.5 }, once: true, price: 2000, find: true, desc: 'Held, used up: at half HP or less, it restores half its max HP.' },
      dead_pepper: { name: 'Dead Pepper', pinchBoost: { at: 0.25, boosts: { atk: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, its Attack rises.' },
      prickly_pineapple: { name: 'Prickly Pineapple', pinchBoost: { at: 0.25, boosts: { def: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, its Defense rises.' },
      thavnairian_onion: { name: 'Thavnairian Onion', pinchBoost: { at: 0.25, boosts: { mag: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, its Magic rises.' },
      oghomoro_berry: { name: "O'Ghomoro Berry", pinchBoost: { at: 0.25, boosts: { res: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, its Resistance rises.' },
      han_lemon: { name: 'Han Lemon', pinchBoost: { at: 0.25, boosts: { spd: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: at 1/4 HP or less, its Speed rises.' },
      four_leaf_clover: { name: 'Four-Leaf Clover', pinchBoost: { at: 0.25, boosts: { crit: 2 } }, once: true, price: 600, shop: 3, desc: 'Held, used up: at 1/4 HP or less, its crits get much likelier (+2 stages).' },
      kazham_pineapple: { name: 'Kazham Pineapple', pinchBoost: { at: 0.25, boosts: { atk: 1, spd: 1 } }, once: true, price: 600, shop: 3, desc: 'Held, used up: at 1/4 HP or less, its Attack and Speed rise.' },
      saruta_orange: { name: 'Saruta Orange', pinchBoost: { at: 0.25, boosts: { mag: 1, spd: 1 } }, once: true, price: 600, shop: 3, desc: 'Held, used up: at 1/4 HP or less, its Magic and Speed rise.' },
      ogre_pumpkin: { name: 'Ogre Pumpkin', pinchBoost: { at: 0.25, boosts: { def: 1, res: 1 } }, once: true, price: 600, shop: 3, desc: 'Held, used up: at 1/4 HP or less, its Defense and Resistance rise.' },
      hero_drink: { name: 'Hero Drink', pinchBoost: { at: 0.25, boosts: { atk: 1, def: 1, mag: 1, res: 1, spd: 1 } }, once: true, price: 3000, find: true, desc: 'Held, used up: at 1/4 HP or less, its Attack, Defense, Magic, Resistance and Speed rise.' },

      // ------------------------------------------------------------------ cure berries (cureStatus: the ailment cured
      // the moment it strikes)
      remedy: { name: 'Remedy', cureStatus: 'all', once: true, price: 600, shop: 3, desc: 'Held, used up: cures the first lasting ailment or confusion it gets.' },
      panacea_leaf: { name: 'Panacea Leaf', cureStatus: 'lasting', once: true, price: 350, shop: 2, desc: 'Held, used up: cures the first lasting ailment it gets.' },
      alarm_cherry: { name: 'Alarm Cherry', cureStatus: ['sleep'], once: true, price: 200, shop: 1, desc: 'Held, used up: wakes it the moment it falls asleep.' },
      star_pendant: { name: 'Star Pendant', cureStatus: ['poison', 'venom'], once: true, price: 250, shop: 1, desc: 'Held, used up: cures Poison or Venom the moment it strikes.' },
      frost_melon: { name: 'Frost Melon', cureStatus: ['burn'], once: true, price: 200, shop: 2, desc: 'Held, used up: cures a Burn the moment it strikes.' },
      haste_bean: { name: 'Haste Bean', cureStatus: ['slow'], once: true, price: 200, shop: 2, desc: 'Held, used up: cures Slow the moment it strikes.' },
      chronos_tear: { name: 'Chronos Tear', cureStatus: ['stop'], once: true, price: 250, shop: 2, desc: 'Held, used up: cures Stop the moment it strikes.' },
      eye_drop_berry: { name: 'Eye Drop Berry', cureStatus: ['blind'], once: true, price: 200, shop: 1, desc: 'Held, used up: cures Blind the moment it strikes.' },
      echo_herb: { name: 'Echo Herb', cureStatus: ['silence'], once: true, price: 200, shop: 2, desc: 'Held, used up: cures Silence the moment it strikes.' },
      clarity_fig: { name: 'Clarity Fig', cureStatus: ['confuse'], once: true, price: 200, shop: 1, desc: 'Held, used up: snaps it out of confusion the moment it strikes.' },
      holy_water: { name: 'Holy Water', cureStatus: ['zombie'], once: true, price: 300, shop: 3, desc: 'Held, used up: cures Zombie the moment it strikes.' },
      mog_mallet: { name: 'Mog Mallet', cureStatus: ['mini'], once: true, price: 250, shop: 3, desc: 'Held, used up: cures Mini the moment it strikes.' },
      fairy_ring: { name: 'Fairy Ring', cureStatus: ['poison', 'venom', 'blind'], once: true, price: 1500, shop: 3, desc: 'Held, used up: cures the first Poison, Venom or Blind it gets.' },
      jem_ring: { name: 'Jem Ring', cureStatus: ['stop', 'slow'], once: true, price: 1500, shop: 3, desc: 'Held, used up: cures the first Stop or Slow it gets.' },

      // ------------------------------------------------------------------ power
      hyper_wrist: { name: 'Hyper Wrist', choice: 'atk', price: 9000, shop: 4, desc: "Held: Attack x1.5, locked into its first move (no cooldown on it)." },
      wizard_earring: { name: 'Wizard Earring', choice: 'mag', price: 9000, shop: 4, desc: "Held: Magic x1.5, locked into its first move (no cooldown on it)." },
      sprint_shoes: { name: 'Sprint Shoes', choice: 'spd', price: 9000, shop: 4, desc: "Held: Speed x1.5, locked into its first move (no cooldown on it)." },
      cursed_ring: { name: 'Cursed Ring', lifeOrb: 0.1, price: 10000, shop: 4, desc: 'Held: its attacks hit 30% harder, but each one costs it 1/10 of its max HP.' },
      champion_belt: { name: 'Champion Belt', expertBelt: true, price: 4000, shop: 3, desc: 'Held: its super-effective hits deal 20% more damage.' },
      genji_gloves: { name: 'Genji Gloves', metronome: true, price: 4000, shop: 3, desc: 'Held: the same move used again in a row hits 20% harder each time, up to x2.' },
      power_wrist: { name: 'Power Wrist', catBoost: { physical: 1.1 }, price: 3000, shop: 2, desc: 'Held: its physical moves hit 10% harder.' },
      gold_hairpin: { name: 'Gold Hairpin', catBoost: { magic: 1.1 }, price: 3000, shop: 2, desc: 'Held: its magic moves hit 10% harder.' },
      kaiser_knuckle: { name: 'Kaiser Knuckle', flagBoost: { punch: 1.2 }, price: 2500, shop: 3, desc: 'Held: its punching moves hit 20% harder.' },
      fenrir_collar: { name: 'Fenrir Collar', flagBoost: { bite: 1.2 }, price: 2500, shop: 3, desc: 'Held: its biting moves hit 20% harder.' },
      mythril_whetstone: { name: 'Mythril Whetstone', flagBoost: { slice: 1.2 }, price: 2500, shop: 3, desc: 'Held: its slicing moves hit 20% harder.' },
      dream_harp: { name: 'Dream Harp', flagBoost: { sound: 1.2 }, price: 2500, shop: 3, desc: 'Held: its sound moves hit 20% harder.' },
      pulse_crystal: { name: 'Pulse Crystal', flagBoost: { pulse: 1.2 }, price: 2500, shop: 3, desc: 'Held: its pulse and aura moves hit 20% harder.' },
      shinra_ammo: { name: 'Shinra Ammo', flagBoost: { bullet: 1.2 }, price: 2500, shop: 3, desc: 'Held: its bullet and bomb moves hit 20% harder.' },
      sylph_feather: { name: 'Sylph Feather', flagBoost: { wind: 1.2 }, price: 2500, shop: 3, desc: 'Held: its wind moves hit 20% harder.' },
      dance_slippers: { name: 'Dance Slippers', flagBoost: { dance: 1.2 }, price: 2500, shop: 3, desc: 'Held: its dance attacks hit 20% harder.' },
      grand_glove: { name: 'Grand Glove', flagBoost: { contact: 1.1 }, price: 2500, shop: 2, desc: 'Held: its contact moves hit 10% harder.' },
      luck_plus: { name: 'Luck Plus', crit: 1, price: 3000, shop: 3, desc: 'Held: its moves land critical hits more often (+1 stage).' },
      nishijin_belt: { name: 'Nishijin Belt', crit: 1, price: 3000, shop: 4, desc: 'Held: its moves land critical hits more often (+1 stage).' },
      sniper_sight: { name: 'Sniper Sight', accMul: 1.1, price: 2000, shop: 2, desc: 'Held: its moves are 10% more accurate.' },
      spyglass: { name: 'Spyglass', zoomLens: 1.2, price: 2000, shop: 2, desc: 'Held: when it moves after its target, its moves are 20% more accurate.' },
      behemoth_horn: { name: 'Behemoth Horn', kingsRock: 10, price: 3000, shop: 3, desc: 'Held: its attacks have a 10% chance to make the target flinch.' },
      coeurl_whisker: { name: 'Coeurl Whisker', kingsRock: 10, price: 3000, shop: 4, desc: 'Held: its attacks have a 10% chance to make the target flinch.' },
      sirens_drops: { name: "Siren's Drops", throatSpray: true, once: true, price: 1500, shop: 3, desc: 'Held, used up: after it uses a sound move, its Magic rises.' },
      fixed_dice: { name: 'Fixed Dice', loadedDice: true, price: 3000, shop: 3, desc: 'Held: its 2-5 hit moves always hit 4 or 5 times.' },
      mognet_policy: { name: 'Mognet Policy', blunderPolicy: true, once: true, price: 1500, shop: 3, desc: 'Held, used up: if its move misses, its Speed rises sharply.' },
      // the legendary blades: a type booster with a little more
      masamune_hilt: { name: 'Masamune Hilt', boost: 'warrior', crit: 1, price: 8000, find: true, desc: 'Held: Warrior moves +20%, and its moves crit more often (+1 stage).' },
      gungnir_tip: { name: 'Gungnir Tip', boost: 'dragoon', accMul: 1.1, price: 8000, find: true, desc: 'Held: Dragoon moves +20%, and its moves are 10% more accurate.' },

      // ------------------------------------------------------------------ defence
      fury_ring: { name: 'Fury Ring', vest: true, price: 6000, shop: 4, desc: "Held: Resistance x1.5, but it can only use attacks (no status moves)." },
      mogs_amulet: { name: "Mog's Amulet", eviolite: true, price: 6000, shop: 3, desc: 'Held: Defense and Resistance x1.5 while it can still evolve.' },
      safety_bit: { name: 'Safety Bit', sash: true, once: true, price: 6000, shop: 3, desc: 'Held, used up: at full HP, it survives a knockout hit with 1 HP.' },
      moogle_charm: { name: 'Moogle Charm', focusChance: 15, price: 3000, shop: 3, desc: 'Held: a 15% chance to hang on with 1 HP from a knockout blow.' },
      bomb_balloon: { name: 'Bomb Balloon', balloon: true, once: true, price: 1500, shop: 2, desc: 'Held, used up: it floats (Monk moves, hazards and terrain miss it) until a hit pops it.' },
      thornlet: { name: 'Thornlet', helmet: 1 / 6, price: 4000, shop: 3, desc: 'Held: a foe that hits it with a contact move loses 1/6 of its max HP.' },
      elven_mantle: { name: 'Elven Mantle', evade: 0.9, price: 3000, shop: 3, desc: "Held: foes' moves are a little less accurate against it (x0.9)." },
      white_cape: { name: 'White Cape', covertCloak: true, price: 3000, shop: 3, desc: "Held: foes' attacks can't add effects to it (no ailments, flinches or drops)." },
      peace_ring: { name: 'Peace Ring', clearAmulet: true, price: 3000, shop: 3, desc: "Held: foes can't lower its stats." },
      moogle_ribbon: { name: 'Moogle Ribbon', covertCloak: true, clearAmulet: true, price: 12000, find: true, desc: "Held: foes can't lower its stats, and their attacks can't add effects to it." },
      long_range: { name: 'Long Range', pads: true, price: 2000, shop: 2, desc: 'Held: its contact moves set off nothing (no helmet, spiky guard or rough hide hurts it).' },
      silver_glasses: { name: 'Silver Glasses', goggles: true, price: 2000, shop: 2, desc: 'Held: it takes no damage from the Sandstorm.' },
      mog_parasol: { name: 'Mog Parasol', umbrella: true, price: 2500, shop: 3, desc: "Held: Radiance and Gloom don't change its moves' power, or the power of moves at it." },
      mog_raincoat: { name: 'Mog Raincoat', goggles: true, umbrella: true, price: 3500, shop: 4, desc: 'Held: no Sandstorm damage, and Radiance and Gloom change no power to or from it.' },
      germinas_boots: { name: 'Germinas Boots', boots: true, price: 4000, shop: 3, desc: 'Held: the hazards on its side never touch it as it comes in.' },
      aegis_shield: { name: 'Aegis Shield', abilityShield: true, price: 3000, shop: 4, desc: "Held: its ability can't be suppressed." },
      teleport_stone: { name: 'Teleport Stone', shedShell: true, price: 2500, shop: 3, desc: 'Held: it can always switch out, whatever is trapping it.' },
      protect_vest: { name: 'Protect Vest', statMul: { def: 1.2 }, price: 4000, shop: 3, desc: 'Held: Defense x1.2.' },
      talisman: { name: 'Talisman', statMul: { res: 1.2 }, price: 4000, shop: 3, desc: 'Held: Resistance x1.2.' },
      choco_feather: { name: 'Choco Feather', statMul: { spd: 1.1 }, price: 3000, shop: 2, desc: 'Held: Speed x1.1.' },
      circlet: { name: 'Circlet', statMul: { mag: 1.1, res: 1.1 }, price: 5000, shop: 4, desc: 'Held: Magic and Resistance x1.1.' },
      marvel_shoes: { name: 'Marvel Shoes', statMul: { def: 1.1, res: 1.1, spd: 1.1 }, price: 12000, find: true, desc: 'Held: Defense, Resistance and Speed x1.1.' },

      // ------------------------------------------------------------------ answering a hit
      limit_charm: { name: 'Limit Charm', weaknessPolicy: true, once: true, price: 4000, shop: 3, desc: 'Held, used up: hit super-effectively, its Attack and Magic rise sharply.' },
      golem_gourd: { name: 'Golem Gourd', hitBoost: { cat: 'physical', boosts: { def: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: hit by a physical move, its Defense rises.' },
      carbuncle_fig: { name: 'Carbuncle Fig', hitBoost: { cat: 'magic', boosts: { res: 1 } }, once: true, price: 500, shop: 2, desc: 'Held, used up: hit by a magic move, its Resistance rises.' },
      counter_fig: { name: 'Counter Fig', hitBoost: { cat: 'physical', boosts: { atk: 1 } }, once: true, price: 500, shop: 3, desc: 'Held, used up: hit by a physical move, its Attack rises.' },
      ether_fig: { name: 'Ether Fig', hitBoost: { cat: 'magic', boosts: { mag: 1 } }, once: true, price: 500, shop: 3, desc: 'Held, used up: hit by a magic move, its Magic rises.' },
      quicksilver_fig: { name: 'Quicksilver Fig', hitBoost: { boosts: { spd: 1 } }, once: true, price: 500, shop: 3, desc: 'Held, used up: hit by any attack, its Speed rises.' },
      cactuar_fruit: { name: 'Cactuar Fruit', hitHurt: { cat: 'physical', frac: 1 / 8 }, once: true, price: 500, shop: 2, desc: 'Held, used up: hit by a physical move, the attacker loses 1/8 of its max HP.' },
      grudge_plum: { name: 'Grudge Plum', hitHurt: { cat: 'magic', frac: 1 / 8 }, once: true, price: 500, shop: 2, desc: 'Held, used up: hit by a magic move, the attacker loses 1/8 of its max HP.' },
      chocobo_whistle: { name: 'Chocobo Whistle', ejectButton: true, once: true, price: 2500, shop: 3, desc: "Held, used up: when it's hit, it switches out for a teammate." },
      triad_card: { name: 'Triad Card', redCard: true, once: true, price: 2500, shop: 3, desc: "Held, used up: when it's hit, the attacker is dragged out for one of its teammates." },

      // ------------------------------------------------------------------ herbs
      white_wind_leaf: { name: 'White Wind Leaf', whiteHerb: true, once: true, price: 1500, shop: 2, desc: 'Held, used up: when a foe lowers its stats, it puts them back to normal.' },
      tranquilizer: { name: 'Tranquilizer', mentalHerb: true, once: true, price: 1500, shop: 2, desc: 'Held, used up: shakes off the first Taunt at once.' },
      turbo_ether: { name: 'Turbo Ether', powerHerb: true, once: true, price: 2000, shop: 3, desc: 'Held, used up: a two-turn move skips its charge turn, once.' },

      // ------------------------------------------------------------------ each turn
      cats_bell: { name: "Cat's Bell", leftovers: true, price: 6000, find: true, desc: 'Held: it restores 1/16 of its max HP at the end of every turn.' },
      bio_sludge: { name: 'Bio Sludge', sludge: 'blackmage', price: 3000, shop: 3, desc: 'Held: a Black Mage regains 1/16 of its HP a turn; any other moogle loses 1/8.' },
      eidolon_ember: { name: 'Eidolon Ember', sludge: 'summoner', price: 3000, shop: 3, desc: 'Held: a Summoner regains 1/16 of its HP a turn; any other moogle loses 1/8.' },
      raw_mako_vial: { name: 'Raw Mako Vial', sludge: 'machinist', price: 3000, shop: 4, desc: 'Held: a Machinist regains 1/16 of its HP a turn; any other moogle loses 1/8.' },
      bomb_core: { name: 'Bomb Core', orb: 'burn', price: 2000, shop: 3, desc: 'Held: at the end of a turn, it Burns its holder if it has no ailment.' },
      poison_ring: { name: 'Poison Ring', orb: 'venom', price: 2000, shop: 3, desc: 'Held: at the end of a turn, it gives its holder Venom if it has no ailment.' },
      vampire_fang: { name: 'Vampire Fang', shellBell: 1 / 8, price: 4000, shop: 3, desc: 'Held: it heals 1/8 of the damage it deals.' },
      hp_absorb: { name: 'HP Absorb', shellBell: 1 / 6, price: 6000, find: true, desc: 'Held: it heals 1/6 of the damage it deals.' },

      // ------------------------------------------------------------------ the field: weather, terrain and walls that
      // last 8 turns (extend), the terrain seeds, Time Warp, speed and turn order
      sun_fragment: { name: 'Sun Fragment', extend: 'radiance', price: 2500, shop: 3, desc: 'Held: Radiance it starts lasts 8 turns instead of 5.' },
      shadow_fragment: { name: 'Shadow Fragment', extend: 'gloom', price: 2500, shop: 3, desc: 'Held: Gloom it starts lasts 8 turns instead of 5.' },
      desert_rose: { name: 'Desert Rose', extend: 'sandstorm', price: 2500, shop: 3, desc: 'Held: a Sandstorm it starts lasts 8 turns instead of 5.' },
      mana_prism: { name: 'Mana Prism', extend: 'manastorm', price: 2500, shop: 3, desc: 'Held: a Manastorm it starts lasts 8 turns instead of 5.' },
      weather_vane: { name: 'Weather Vane', extend: 'weather', price: 4000, shop: 4, desc: 'Held: any weather it starts lasts 8 turns instead of 5.' },
      tuning_fork: { name: 'Tuning Fork', extend: 'rhythm', price: 2000, shop: 3, desc: 'Held: a Rhythm Field it starts lasts 8 turns instead of 5.' },
      lifestream_vial: { name: 'Lifestream Vial', extend: 'lifestream', price: 2000, shop: 3, desc: 'Held: a Lifestream it starts lasts 8 turns instead of 5.' },
      fog_lantern: { name: 'Fog Lantern', extend: 'fog', price: 2000, shop: 3, desc: 'Held: a Fog it starts lasts 8 turns instead of 5.' },
      chrono_gear: { name: 'Chrono Gear', extend: 'chrono', price: 2000, shop: 3, desc: 'Held: a Time Field it starts lasts 8 turns instead of 5.' },
      geomancers_bell: { name: "Geomancer's Bell", extend: 'terrain', price: 3500, shop: 4, desc: 'Held: any terrain it starts lasts 8 turns instead of 5.' },
      protect_ring: { name: 'Protect Ring', extend: 'walls', price: 3000, shop: 3, desc: 'Held: the Protect, Shell or Veil it puts up lasts 8 turns instead of 5.' },
      melody_seed: { name: 'Melody Seed', terrainBoost: { rhythm: { mag: 1 } }, once: true, price: 1000, shop: 3, desc: 'Held, used up: on a Rhythm Field, its Magic rises.' },
      gaia_seed: { name: 'Gaia Seed', terrainBoost: { lifestream: { def: 1 } }, once: true, price: 1000, shop: 3, desc: 'Held, used up: on the Lifestream, its Defense rises.' },
      mist_seed: { name: 'Mist Seed', terrainBoost: { fog: { res: 1 } }, once: true, price: 1000, shop: 3, desc: 'Held, used up: in a Fog, its Resistance rises.' },
      chrono_seed: { name: 'Chrono Seed', terrainBoost: { chrono: { spd: 1 } }, once: true, price: 1000, shop: 3, desc: 'Held, used up: on a Time Field, its Speed rises.' },
      turtleshell_choker: { name: 'Turtleshell Choker', roomService: true, once: true, price: 1500, shop: 4, desc: 'Held, used up: when Time Warp starts, its Speed falls (the slowest move first there).' },
      // (the id iron_ball is the one KP.grounded knows)
      iron_ball: { name: 'Adamant Anchor', ironBall: true, price: 1000, shop: 3, desc: 'Held: Speed x0.5, and it stays on the ground (Monk moves and terrain reach it).' },
      tonberry_lantern: { name: 'Tonberry Lantern', laggingTail: true, price: 1000, shop: 3, desc: 'Held: it moves last among moves of the same priority.' },
      hermes_sandals: { name: 'Hermes Sandals', quickChance: 25, price: 4000, shop: 4, desc: 'Held: a 25% chance to move first among moves of the same priority.' },
      malboro_vine: { name: 'Malboro Vine', bindBand: true, price: 2000, shop: 3, desc: "Held: its binding moves take 1/6 of the foe's max HP a turn instead of 1/8." },
      ochu_tendril: { name: 'Ochu Tendril', gripClaw: true, price: 2000, shop: 3, desc: 'Held: its binding moves hold the foe for 7 turns.' },

      // ------------------------------------------------------------------ signature items (statMul for one line)
      ember_wick: { name: 'Ember Wick', statMul: { mag: 2 }, forSpecies: ['kupwick_blackmage', 'kupwick_blackwizard'], price: 5000, find: true, desc: "Held: Magic x2 for a Kupwick that isn't a Magus yet." },
      mime_greasepaint: { name: 'Mime Greasepaint', statMul: { def: 2, res: 2 }, forSpecies: ['tufty_freelancer', 'tufty_mime'], price: 5000, find: true, desc: 'Held: Defense and Resistance x2 for a Tufty.' },
      mognet_stamp: { name: 'Mognet Stamp', statMul: { atk: 1.5 }, forSpecies: ['stampo_monk', 'stampo_blackbelt'], price: 5000, find: true, desc: 'Held: Attack x1.5 for a Stampo.' },

      // ------------------------------------------------------------------ outside battle
      kupo_coin: { name: 'Kupo Coin', coins: 1.5, price: 3000, shop: 2, desc: 'Held by a team member: prize coins x1.5 (trainer battles and tournament purses).' },
      embroidered_tippet: { name: 'Embroidered Tippet', expMul: 1.2, price: 5000, shop: 4, desc: 'Held: it earns 20% more EXP (x1.2).' },
    },
  });
})();

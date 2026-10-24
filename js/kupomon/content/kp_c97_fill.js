// Kupomon: content gaps filled (the user, 2026-10-04: the content check's warnings). Eleven abilities no moogle had,
// each the hidden ability (the third slot: 1 in 20 met in the wild, 1 in 5 bred) of an expansion kind whose theme fits
// it and that had only two (the old Kupodex's kinds keep one or two: tools/kp_learncheck.js), so no slot anyone uses moves (the World Championship sets pick slots 0 and 1 by number). Loaded after
// every content pack: the kinds come from the era packs. (The three moves no one learned are Skill Chips 72 to 74:
// content/kp_c03_tools.js)
(function () {
  const KP = FF7.kupomon;
  const HIDDEN = {
    valimog_mothercrystal: 'life_crystal',     // (the Mothercrystal: strongest on the Lifestream)
    gravekin_deathlord: 'ghoul_fang',          // (a deathlord's bite)
    gaiapom_geomancer: 'funguar_spores',       // (the earth's spores)
    phialmog_goldsmith: 'mini_hammer',         // (a goldsmith's little hammer)
    gougpom_giant: 'titans_might',             // (a giant's strength)
    anvilmog_armorer: 'armor_shed',            // (an armorer sheds its plate)
    avamog_reactor_raider: 'mako_geyser',      // (a reactor raider: mako)
    lowpom_rogue: 'venom_shards',              // (a rogue's caltrops)
    mogwolf_sea_wolf: 'leviathan_hide',        // (a sea wolf: the Leviathan's hide)
    mechmog_warmech: 'reverse_polarity',       // (a war machine's crossed wiring)
    momatose_dreamwalker: 'idle_giant',        // (a dreamwalker, half asleep)
  };
  for (const [sp, ab] of Object.entries(HIDDEN)) {
    const L = KP.SPECIES_ABIL && KP.SPECIES_ABIL[sp];
    if (!L || !KP.ABILITIES[ab]) { console.warn('Kupomon: no kind or ability for a hidden ability', sp, ab); continue; }
    if (L.length === 2) L.push(ab);
  }
})();

// Kupomon's expansion content (docs/KUPOMON_CONTENT.md): each file in js/kupomon/content/ hands one pack to KP.content,
// and this puts it in place: jobs (their looks), moves, abilities, held items, species (six stats, on the cap of 50:
// no rescaling), their learnsets (each evolution inherits its earlier job's list up to the evolution level, as
// kp_learnsets.js builds the old ones), their abilities, wild rows (_new: already on the cap of 50), breeding recipes,
// the Kupodex order and a field model for each. tools/kp_contentcheck.js checks every pack against
// docs/KUPOMON_MECHANICS.md.
//   KP.content(name, { jobs, moves, abilities, items, species, wild, breed, dex })
// A species: { moogle, job, type?, type2?, base: { hp, atk, def, mag, res, spd }, rate, exp, curve, fur, pom, nose,
//   wing, look, evo: { at, to }, desc, abilities: [ids], learn: '1 move, 1 move, 5 move, ...', habitat, rarity, class }
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  KP.CONTENT = KP.CONTENT || {};          // pack name -> { species: [ids], moves: [ids], ... } (the checker's view)
  KP.BREED_RECIPES = KP.BREED_RECIPES || [];
  const parse = (s) => (s || '').split(',').map(t => t.trim()).filter(Boolean).map(t => { const [l, m] = t.split(/\s+/); return [+l, m]; });

  // the expansion's held items in the Marts: an item with shop: n (1-4) is sold in the region-n Mog Centers, each town
  // a share of them (round-robin, so the towns differ), the post-game Costa del Kupo all of the last tier and the third
  KP.CENTER_TIER = { kp_center: 1, kp_mogridge_center: 1, kp_kurotsuki_center: 1, kp_fernwick_center: 2, kp_cogsworth_center: 2, kp_mogfield_center: 2,
    kp_nibelpeaks_center: 3, kp_sandsea_center: 3, kp_skyport_center: 3, kp_bloomhaven_center: 4, kp_ravenmoor_center: 4, kp_coliseum_center: 4, kp_costa_center: 5,
    kp_candlerock_center: 5, kp_glimmerfair_center: 5 };   // (Region 5's, as Costa's: all the late gear)
  KP.heldStock = function (centerId) {
    const tier = KP.CENTER_TIER[centerId]; if (!tier) return [];
    const items = Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'held' && KP.ITEMS[k].shop);
    if (tier === 5) return items.filter(k => KP.ITEMS[k].shop >= 3);
    const towns = Object.keys(KP.CENTER_TIER).filter(c => KP.CENTER_TIER[c] === tier), i = towns.indexOf(centerId);
    return items.filter(k => KP.ITEMS[k].shop === tier).filter((k, j) => j % towns.length === i);
  };

  KP.content = function (name, pack) {
    const rec = KP.CONTENT[name] = { jobs: [], moves: [], abilities: [], items: [], species: [], wild: [], breed: 0, clash: [] };
    // (an id already taken is kept as it was and reported: tools/kp_contentcheck.js)
    const put = (table, kind, id, v) => { if (table[id]) { rec.clash.push(kind + ' ' + id); return false; } table[id] = v; rec[kind].push(id); return true; };
    for (const [id, j] of Object.entries(pack.jobs || {})) put(KP.JOBS, 'jobs', id, j);
    for (const [id, m] of Object.entries(pack.moves || {})) put(KP.MOVES, 'moves', id, Object.assign({ power: 0, acc: 100, cd: 0 }, m));
    for (const [id, a] of Object.entries(pack.abilities || {})) put(KP.ABILITIES, 'abilities', id, a);
    for (const [id, it] of Object.entries(pack.items || {})) put(KP.ITEMS, 'items', id, Object.assign({ kind: 'held' }, it));
    // species: defaults, the job's type, the learnsets (own entries; an evolution inherits), abilities, a field model
    const own = {};
    for (const [id, s0] of Object.entries(pack.species || {})) {
      if (KP.SPECIES[id]) { rec.clash.push('species ' + id); continue; }
      const s = Object.assign({ rate: 120, exp: 60, curve: 'medium', moves: [] }, s0);
      if (!s.type && KP.JOBS[s.job]) s.type = KP.JOBS[s.job].type;
      if (!s.type2) delete s.type2;
      s._new = true;   // (written for the cap of 50)
      if (s.abilities) { KP.SPECIES_ABIL[id] = s.abilities.slice(); delete s.abilities; }
      own[id] = s.learn; delete s.learn;
      KP.SPECIES[id] = s; rec.species.push(id);
    }
    const pre = {};
    for (const id of rec.species) { const e = KP.SPECIES[id].evo; if (e) pre[e.to] = id; }
    const built = {};
    const build = (id) => {
      if (built[id]) return built[id];
      const p = pre[id], inh = p ? build(p).filter(([l]) => l <= KP.SPECIES[p].evo.at) : [];
      const all = inh.concat(parse(own[id])).map((e, i) => [e, i]);
      all.sort((a, b) => a[0][0] - b[0][0] || a[1] - b[1]);
      return (built[id] = all.map(x => x[0]));
    };
    for (const id of rec.species) { KP.LEARN[id] = build(id); KP.SPECIES[id].moves = KP.movesAt ? KP.movesAt(id, 50) : KP.LEARN[id].slice(-4).map(e => e[1]); }
    // wild rows (on the cap of 50 already): kept aside and added when a Kupomon game starts (KP.rescaleWild), after
    // the map files have set their own tables (a region file sets a whole table, which would drop rows added now)
    KP.WILD_ADD = KP.WILD_ADD || {};
    for (const [map, rows] of Object.entries(pack.wild || {})) {
      const t = KP.WILD_ADD[map] = KP.WILD_ADD[map] || [];
      for (const r of rows) { const row = r.slice(); row._new = true; t.push(row); rec.wild.push(map); }
    }
    // held items lying on the maps (kp_learn.js KP.placeChips puts them down with the Skill Chips): { item, map, at, hidden }
    for (const pl of pack.places || []) (KP.ITEM_PLACES = KP.ITEM_PLACES || []).push(pl);
    // trainers' themed teams (kp_world.js KP.teamFor: by trainer id; rivals by meeting; the tournament pool by name)
    for (const [id, team] of Object.entries(pack.teams || {})) (KP.TEAM_OVERRIDES = KP.TEAM_OVERRIDES || {})[id] = team;
    for (const [who, meets] of Object.entries(pack.rivals || {})) if (KP.RIVALS && KP.RIVALS[who]) Object.assign(KP.RIVALS[who], meets);
    for (const [name, team] of Object.entries(pack.pool || {})) (KP.POOL_OVERRIDES = KP.POOL_OVERRIDES || {})[name] = team;
    // breeding recipes (kp_breed.js KP.breedResult)
    for (const b of pack.breed || []) { KP.BREED_RECIPES.push(Object.assign({ pack: name }, b)); rec.breed++; }
    // the Kupodex: after everything before it, in the pack's order
    const order = pack.dex || rec.species;
    for (const id of order) if (KP.SPECIES[id] && !KP.DEX.includes(id)) KP.DEX.push(id);
    // a field model for each (kp_models.js registers the ones there at load)
    if (FF7.creatures && KP.moogleModel) {
      FF7.creatures.MODELS = FF7.creatures.MODELS || {};
      for (const id of rec.species) FF7.creatures.MODELS['kp_' + id] = () => { const m = KP.moogleModel(id, { style: 'field' }); m.enemyHuman = true; return m; };
    }
    return rec;
  };
})();

// Kupo Capsules and Kupo Patches: changing a moogle's ability, as Pokémon's Ability Capsule and Ability Patch do (the
// user, 2026-10-02: "is there any current way of changing a mog's ability like in pokemon? ... available after
// defeating the kupo league"). A kind has two usual abilities and, some, a hidden third (kp_abilities.js); a moogle has
// one, by the slot it was made with. The Capsule swaps it for the kind's other usual one; the Patch awakens the
// hidden one (or puts a hidden one back to the first). Used from the Bag (Field Items) on a moogle. Sold once the Kupo
// League is won, in the Marts of the fourth region on (the Coliseum's too). The Demo picks each member's best ability
// with them (js/kupomon/kp_runner.js R.kpAbilities)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  KP.ITEMS.kupo_capsule = { name: 'Kupo Capsule', kind: 'ability', price: 10000,
    desc: "Swaps a moogle's ability for the other one its kind usually has." };
  KP.ITEMS.kupo_patch = { name: 'Kupo Patch', kind: 'ability', price: 40000,
    desc: "Awakens a moogle's hidden ability, if its kind has one (or puts a hidden one back to its first)." };
  KP.ABILITY_ITEMS = ['kupo_capsule', 'kupo_patch'];
  // (in the Bag's Field Items pocket, with the Pom Sprays)
  const P = KP.BAG_POCKETS && KP.BAG_POCKETS.find(p => p.id === 'field');
  if (P && !P.kinds.includes('ability')) P.kinds.push('ability');

  // a kind's ability slots, and the slot a moogle has
  KP.abilSlots = (mon) => (KP.SPECIES_ABIL && KP.SPECIES_ABIL[mon.sp]) || [];
  KP.abilSlot = (mon) => { const L = KP.abilSlots(mon); return L.length ? (mon.abil || 0) % L.length : 0; };
  // the slot an item would give it, or null if it would do nothing
  KP.abilityItemSlot = (id, mon) => {
    const L = KP.abilSlots(mon), cur = KP.abilSlot(mon);
    if (id === 'kupo_capsule') return L.length >= 2 && cur < 2 && L[0] !== L[1] ? 1 - cur : null;
    if (id === 'kupo_patch') return L.length >= 3 && L[2] ? (cur === 2 ? 0 : 2) : null;
    return null;
  };
  // using one on a moogle: { ok, text }
  KP.useAbilityItem = function (id, mon) {
    const d = FF7.state.kp;
    if (!(d.bag[id] > 0)) return { ok: false, text: "You don't have any of those." };
    const to = KP.abilityItemSlot(id, mon);
    if (to == null) return { ok: false, text: "It won't have any effect." };
    const before = (KP.abilityOf(mon) || {}).name || '?';
    KP.take(id); mon.abil = to;
    const after = (KP.abilityOf(mon) || {}).name || '?';
    return { ok: true, text: `${KP.name(mon)}'s ability changed from ${before} to ${after}!` };
  };

  // sold once the Kupo League is won, in the fourth region's Marts on (KP.CENTER_TIER 4 and 5)
  KP.abilityItemStock = (mapId) => (FF7.state && FF7.state.flags && FF7.state.flags.kp_champion && ((KP.CENTER_TIER && KP.CENTER_TIER[mapId]) || 0) >= 4) ? KP.ABILITY_ITEMS.slice() : [];
  if (KP.shop && !KP.shop._abil) {
    const shop0 = KP.shop;
    KP.shop = function (stock, o) {
      const at = FF7.fieldScene && FF7.fieldScene.map && FF7.fieldScene.map.id;
      return shop0(stock.concat(KP.abilityItemStock(at).filter(id => !stock.includes(id))), o);
    };
    KP.shop._abil = true; KP.shop._repels = true;
  }
})();

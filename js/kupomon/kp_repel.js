// Pom Sprays: Kupomon's Repels (the user, 2026-10-02: "items like Pokémon's repel items"). Sprayed on the lead moogle's
// pom-pom: for so many steps, wild moogles of a lower level than the lead keep away (one of the same level or higher
// still comes, as Pokémon's). One at a time: a second can't go on while the first lasts. Steps count anywhere on a
// Kupomon map; when one wears off, "Use another?" if the Bag has any. Every Mart sells the Pom Spray, the second
// region's Marts the Super too, the fourth's the Max; they live in the Bag's Field Items pocket. The Demo keeps one on
// while its whole team is at the level cap (js/kupomon/kp_runner.js R.kpRepelSide)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const D = () => FF7.state.kp;
  const cloud = () => (FF7.state.chars && FF7.state.chars.cloud && FF7.state.chars.cloud.name) || 'Cloud';

  KP.ITEMS.pom_spray = { name: 'Pom Spray', kind: 'repel', steps: 100, price: 350,
    desc: "Sprayed on the lead moogle's pom-pom: for 100 steps, wild moogles of a lower level than it keep away." };
  KP.ITEMS.super_pom_spray = { name: 'Super Pom Spray', kind: 'repel', steps: 200, price: 500,
    desc: "A stronger scent: for 200 steps, wild moogles of a lower level than the lead keep away." };
  KP.ITEMS.max_pom_spray = { name: 'Max Pom Spray', kind: 'repel', steps: 250, price: 700,
    desc: "The strongest: for 250 steps, wild moogles of a lower level than the lead keep away." };
  KP.REPELS = ['pom_spray', 'super_pom_spray', 'max_pom_spray'];

  // the Bag's pocket for them, before the Key Items (the battle's pockets, Repairs and Kupo Nuts, stay first)
  if (KP.BAG_POCKETS && !KP.BAG_POCKETS.some(P => P.id === 'field')) {
    const k = KP.BAG_POCKETS.findIndex(P => P.id === 'key');
    KP.BAG_POCKETS.splice(k < 0 ? KP.BAG_POCKETS.length : k, 0, { id: 'field', name: 'Field Items', kinds: ['repel'], col: '#2f8a8a' });
  }

  // which a Mart sells: every Mart the Pom Spray; from the second region's (KP.CENTER_TIER 2) the Super; from the
  // fourth's the Max. Added to every Mart's shelves (KP.shop)
  KP.repelStock = function (mapId) {
    const tier = (KP.CENTER_TIER && KP.CENTER_TIER[mapId]) || 1;
    return ['pom_spray'].concat(tier >= 2 ? ['super_pom_spray'] : [], tier >= 4 ? ['max_pom_spray'] : []);
  };
  if (KP.shop && !KP.shop._repels) {
    const shop0 = KP.shop;
    KP.shop = function (stock, o) {
      const at = FF7.fieldScene && FF7.fieldScene.map && FF7.fieldScene.map.id;
      return shop0(stock.concat(KP.repelStock(at).filter(id => !stock.includes(id))), o);
    };
    KP.shop._repels = true;
  }

  // the spray on now, if any: { id, steps left }
  KP.repelOn = () => { const r = D() && D().repel; return r && r.steps > 0 ? r : null; };
  const lead = () => (D().party || []).find(m => m.hp > 0) || null;
  // a wild moogle the spray keeps away (KP.step, kp_core.js): lower in level than the lead
  KP.repelBlocks = (mon) => { if (!KP.repelOn()) return false; const L = lead(); return !!L && mon.lv < L.lv; };
  // spraying one on (the Bag; the wear-off's "Use another?"): { ok, text }
  KP.useRepel = function (id) {
    const d = D(), it = KP.ITEMS[id];
    if (!it || it.kind !== 'repel' || !(d.bag[id] > 0)) return { ok: false, text: "You don't have any of those." };
    const on = KP.repelOn();
    if (on) return { ok: false, text: `The ${KP.ITEMS[on.id].name} from earlier is still working (${Math.ceil(on.steps)} steps left).` };
    const L = lead(); if (!L) return { ok: false, text: 'There is no moogle up to spray it on.' };
    KP.take(id); d.repel = { id, steps: it.steps };
    return { ok: true, text: `${cloud()} sprayed the ${it.name} on ${KP.name(L)}'s pom-pom.\fWild moogles weaker than it will keep away for ${it.steps} steps.` };
  };
  // each step on a Kupomon map (field.js stepEncounter): the spray wears down; worn off, a word and "Use another?"
  KP.repelStep = function (fs, dist) {
    const d = D(), r = d && d.repel; if (!r) return;
    r.steps -= dist;
    if (r.steps > 0) return;
    const name = (KP.ITEMS[r.id] || {}).name || 'spray';
    d.repel = null;
    fs.runScript(function* (s) {
      s.sfx('cursor');
      yield s.msg(`The ${name} wore off.`);
      const have = KP.REPELS.filter(k => d.bag[k] > 0);
      if (!have.length) return;
      const c = yield s.ask(null, 'Use another?', have.map(k => `${KP.ITEMS[k].name} x${d.bag[k]}`).concat(['No']));
      if (c == null || c < 0 || c >= have.length) return;
      const u = KP.useRepel(have[c]);
      if (u.ok) s.sfx('heal');
      yield s.msg(u.text);
    }, { name: 'kp-repel' });
  };
})();

// Inventory: ordered list of { id, qty } (items, weapons, armor, accessories share one list
// like FF7), key items, gil.
(function () {
  const U = FF7.util;
  const INV = FF7.sys.inv = {};
  const MAX = 99;

  INV.count = function (id) {
    const e = FF7.state.items.find(i => i.id === id);
    return e ? e.qty : 0;
  };
  INV.add = function (id, qty = 1) {
    if (!id) return;
    if (id.startsWith('materia:')) { for (let i = 0; i < qty; i++) FF7.sys.materia.toStock(FF7.sys.materia.make(id.slice(8))); return; }
    if (FF7.data.keyItems[id] && !U.findItem(id)) { INV.addKey(id); return; }
    const list = FF7.state.items;
    const e = list.find(i => i.id === id);
    if (e) e.qty = Math.min(MAX, e.qty + qty);
    else list.push({ id, qty: Math.min(MAX, qty) });
  };
  INV.remove = function (id, qty = 1) {
    const list = FF7.state.items;
    const i = list.findIndex(e => e.id === id);
    if (i < 0 || list[i].qty < qty) return false;
    list[i].qty -= qty;
    if (list[i].qty <= 0) list.splice(i, 1);
    return true;
  };
  INV.has = (id, qty = 1) => FF7.data.keyItems[id] && !U.findItem(id) ? INV.hasKey(id) : INV.count(id) >= qty;

  INV.addKey = function (id) { if (!FF7.state.keyItems.includes(id)) FF7.state.keyItems.push(id); };
  INV.removeKey = function (id) { const k = FF7.state.keyItems; const i = k.indexOf(id); if (i >= 0) k.splice(i, 1); };
  INV.hasKey = (id) => FF7.state.keyItems.includes(id);

  INV.addGil = function (n) { FF7.state.gil = U.clamp(FF7.state.gil + Math.floor(n), 0, 99999999); };
  INV.spendGil = function (n) { if (FF7.state.gil < n) return false; FF7.state.gil -= n; return true; };

  // Items usable in a context ('field' | 'battle')
  INV.usable = function (ctx) {
    return FF7.state.items.filter(e => { const d = FF7.data.items[e.id]; return d && d[ctx]; });
  };
  INV.sellPrice = function (id) {
    if (id && id.startsWith && id.startsWith('materia:')) return 0;
    const f = U.findItem(id);
    if (!f) return 0;
    return f.def.sell != null ? f.def.sell : Math.floor((f.def.price || 0) / 2);
  };

  // Sort like FF7 "Arrange": by type then name
  INV.arrange = function (mode = 'type') {
    const order = { item: 0, weapon: 1, armor: 2, accessory: 3 };
    FF7.state.items.sort((a, b) => {
      const fa = U.findItem(a.id), fb = U.findItem(b.id);
      if (mode === 'name') return (fa ? fa.def.name : a.id).localeCompare(fb ? fb.def.name : b.id);
      if (mode === 'most') return b.qty - a.qty;
      if (mode === 'least') return a.qty - b.qty;
      const ka = fa ? order[fa.kind] : 9, kb = fb ? order[fb.kind] : 9;
      return ka - kb || 0;
    });
  };
})();

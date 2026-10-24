// Data normalisation run once at boot (FF7.dataFixups): fills defaults so every table the engine
// reads has the fields it expects, whatever agent/file produced it.
(function () {
  FF7.dataFixups = function () {
    const D = FF7.data;
    const warn = [];
    // items / equipment: names, prices, ids
    ['items', 'weapons', 'armor', 'accessories', 'keyItems'].forEach(t => {
      const T = D[t] || {};
      for (const id in T) { const d = T[id]; d.id = d.id || id; if (!d.name) { d.name = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); warn.push(t + ':' + id); } if (d.price == null && t !== 'keyItems') d.price = 0; }
    });
    // materia: type + name + AP table
    for (const id in D.materia || {}) { const m = D.materia[id]; m.id = m.id || id; m.name = m.name || id; m.ap = m.ap || []; m.price = m.price || 0; }
    // enemies: a model description, level, basic stats
    for (const id in D.enemies || {}) {
      const e = D.enemies[id]; e.id = e.id || id; e.name = e.name || id;
      e.look = e.look || { type: 'blob' };
      ['hp', 'mp', 'level', 'exp', 'ap', 'gil'].forEach(k => { if (e[k] == null) e[k] = 0; });
      if (!e.hp) { e.hp = 1; warn.push('enemy hp:' + id); }
    }
    // encounter tables: every formation lists enemies that exist; weights default to 1
    for (const tid in D.encounters || {}) {
      const T = D.encounters[tid]; if (!Array.isArray(T)) continue;
      T.forEach(f => { if (f.w == null) f.w = 1; const key = f.e ? 'e' : 'enemies'; if (f[key]) f[key] = f[key].filter(e => { const id = typeof e === 'string' ? e : e.id; if (!D.enemies[id]) { warn.push(`encounter ${tid}: unknown enemy ${id}`); return false; } return true; }); });
    }
    // shops: stock ids that exist
    for (const sid in D.shops || {}) { const s = D.shops[sid]; s.stock = (s.stock || []).filter(id => (s.type === 'materia' ? D.materia[id] : FF7.util.findItem(id) || D.materia[id])); }
    if (warn.length && FF7.DEBUG) console.warn('dataFixups:', warn.length, 'issues', warn.slice(0, 40));
    return warn;
  };
})();

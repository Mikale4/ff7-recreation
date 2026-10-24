// Save / load: 15 slots in localStorage (like a PS1 memory card file), plus export/import to a
// .json file so saves survive clearing browser data.
(function () {
  const U = FF7.util;
  const KEY = 'ff7js_save_';
  const SLOTS = 15;

  const SV = FF7.save = { SLOTS };

  function summary(st) {
    const lead = st.chars[st.party.find(p => p) || 'cloud'];
    return {
      leader: lead ? lead.id : 'cloud',
      leaderName: lead ? lead.name : 'Cloud',
      level: lead ? lead.level : 1,
      party: st.party.slice(),
      location: st.locName || '',
      time: st.time,
      gil: st.gil,
      disc: st.disc,
      date: Date.now(),
    };
  }

  SV.list = function () {
    const out = [];
    for (let i = 0; i < SLOTS; i++) {
      let s = null;
      try { const raw = localStorage.getItem(KEY + i); if (raw) s = JSON.parse(raw).summary; } catch (e) { s = null; }
      out.push(s);
    }
    return out;
  };

  SV.write = function (slot, st = FF7.state, extra) {
    try {
      localStorage.setItem(KEY + slot, JSON.stringify({ summary: Object.assign(summary(st), extra || {}), state: st }));
      localStorage.setItem(KEY + 'last', String(slot));
      return true;
    } catch (e) { console.error(e); return false; }
  };

  SV.read = function (slot) {
    try {
      const raw = localStorage.getItem(KEY + slot);
      if (!raw) return null;
      return SV.migrate(JSON.parse(raw).state);
    } catch (e) { console.error(e); return null; }
  };

  // The file the Demo saves into: one of the 15 real slots, so it can be continued like any save. Its own file
  // from before (tagged demo in the summary, or remembered), else the first empty slot, else File 15.
  SV.demoSlot = function () {
    const L = SV.list();
    let s = -1; try { const v = localStorage.getItem(KEY + 'demoslot'); if (v != null) s = +v; } catch (e) { s = -1; }
    if (s >= 0 && s < SLOTS && (!L[s] || L[s].demo)) return s;
    const own = L.findIndex(x => x && x.demo); if (own >= 0) return own;
    const free = L.findIndex(x => !x); if (free >= 0) return free;
    return SLOTS - 1;
  };
  SV.writeDemoSlot = function (st = FF7.state) {
    const slot = SV.demoSlot();
    if (!SV.write(slot, st, { demo: true })) return -1;
    try { localStorage.setItem(KEY + 'demoslot', String(slot)); } catch (e) { /* the tag in the summary still finds it */ }
    return slot;
  };
  // An older Demo's file (before it saved into a real slot): a key of its own. The Load
  // menu lists it as "DEMO" (js/ui/save_menu.js); SV.read('demo') loads it.
  SV.writeDemo = function (st = FF7.state) {
    try { localStorage.setItem(KEY + 'demo', JSON.stringify({ summary: summary(st), state: st })); return true; } catch (e) { console.error(e); return false; }
  };
  SV.demoSummary = function () {
    try { const raw = localStorage.getItem(KEY + 'demo'); return raw ? JSON.parse(raw).summary : null; } catch (e) { return null; }
  };

  // Config > Autosave (js/ui/qol.js): a file of its own, never one of the 15; the Load screen lists it first
  SV.writeAuto = function (st = FF7.state) {
    try { localStorage.setItem(KEY + 'auto', JSON.stringify({ summary: summary(st), state: st })); return true; } catch (e) { console.error(e); return false; }
  };
  SV.autoSummary = function () {
    try { const raw = localStorage.getItem(KEY + 'auto'); return raw ? JSON.parse(raw).summary : null; } catch (e) { return null; }
  };

  // Delete a file (the Save / Load screen's Square): a slot number, 'auto' or 'demo'. The markers that point at it go too
  SV.remove = function (slot) {
    try {
      localStorage.removeItem(KEY + slot);
      ['last', 'demoslot'].forEach(k => { if (localStorage.getItem(KEY + k) === String(slot)) localStorage.removeItem(KEY + k); });
      return true;
    } catch (e) { console.error(e); return false; }
  };

  SV.lastSlot = function () {
    try { const v = localStorage.getItem(KEY + 'last'); return v == null ? -1 : +v; } catch (e) { return -1; }
  };

  SV.hasAny = function () { return SV.list().some(s => s); };

  // Upgrade older saves with any new fields.
  SV.migrate = function (st) {
    const fresh = FF7.newState();
    for (const k in fresh) if (st[k] === undefined) st[k] = fresh[k];
    st.config = Object.assign(FF7.defaultConfig(), st.config || {});
    for (const id in st.chars) {
      const c = st.chars[id];
      if (!c.bonus) c.bonus = { str: 0, vit: 0, mag: 0, spr: 0, dex: 0, lck: 0 };
      if (!c.status) c.status = {};
      FF7.sys.stats.fitMateriaSlots(c);
      FF7.sys.stats.recalc(c);
    }
    return st;
  };

  // Download all slots as one JSON file.
  SV.exportAll = function () {
    const data = {};
    for (let i = 0; i < SLOTS; i++) { const raw = localStorage.getItem(KEY + i); if (raw) data[i] = JSON.parse(raw); }
    const au = localStorage.getItem(KEY + 'auto'); if (au) data.auto = JSON.parse(au);   // (the Autosave file; importAll writes every key back)
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ff7_memory_card.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  SV.importAll = function (onDone) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          for (const k in data) localStorage.setItem(KEY + k, JSON.stringify(data[k]));
          onDone && onDone(true);
        } catch (e) { onDone && onDone(false); }
      };
      r.readAsText(f);
    };
    inp.click();
  };
})();

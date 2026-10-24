// Small shared helpers.
(function () {
  const U = FF7.util = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (n) => Math.floor(Math.random() * n);           // int in [0, n)
  U.randRange = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // int in [a, b]
  U.chance = (pct) => Math.random() * 100 < pct;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = U.rand(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  U.weighted = (list, wKey) => {  // list of [value, weight] or objects with weight key
    let total = 0;
    for (const it of list) total += wKey ? (it[wKey] || 0) : it[1];
    let r = Math.random() * total;
    for (const it of list) { r -= wKey ? (it[wKey] || 0) : it[1]; if (r < 0) return wKey ? it : it[0]; }
    return wKey ? list[list.length - 1] : list[list.length - 1][0];
  };
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.pad = (n, w, c = ' ') => String(n).padStart(w, c);
  U.fmtTime = (sec) => {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return U.pad(h, 2, '0') + ':' + U.pad(m, 2, '0') + ':' + U.pad(s, 2, '0');
  };
  U.fmtNum = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Deterministic hash-based random for procedural graphics (x,y,seed) -> [0,1)
  U.hash = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 100000) / 100000;
  };
  // Seeded PRNG (mulberry32)
  U.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  U.strSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // Colour helpers ("#rrggbb")
  U.hexToRgb = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.shade = (hex, amt) => { // amt -1..1 : darken / lighten
    const [r, g, b] = U.hexToRgb(hex);
    if (amt < 0) return U.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
    return U.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  };
  U.mix = (h1, h2, t) => {
    const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
    return U.rgbToHex(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t));
  };
  U.rgba = (hex, a) => { const [r, g, b] = U.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  U.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  // Look up any inventory-able thing by id across items / weapons / armor / accessories.
  U.findItem = (id) => {
    const D = FF7.data;
    if (D.items[id]) return { kind: 'item', def: D.items[id] };
    if (D.weapons[id]) return { kind: 'weapon', def: D.weapons[id] };
    if (D.armor[id]) return { kind: 'armor', def: D.armor[id] };
    if (D.accessories[id]) return { kind: 'accessory', def: D.accessories[id] };
    return null;
  };
  U.itemName = (id) => {
    if (!id) return '';
    if (id.startsWith && id.startsWith('materia:')) { const m = FF7.data.materia[id.slice(8)]; return m ? m.name : id; }
    const f = U.findItem(id);
    if (f) return f.def.name;
    const k = FF7.data.keyItems[id];
    return k ? k.name : id;
  };

  // Replace {CLOUD} style tokens with current character names.
  U.names = (text) => {
    if (!text || text.indexOf('{') < 0) return text;
    return text.replace(/\{([A-Z0-9_]+)\}/g, (m, key) => {
      const id = key.toLowerCase();
      const st = FF7.state;
      if (st && st.chars && st.chars[id]) return st.chars[id].name;
      const def = FF7.data.characters[id];
      if (def) return def.name;
      if (key === 'GIL' && st) return U.fmtNum(st.gil);
      return m;
    });
  };

  U.log = (...a) => { if (FF7.DEBUG) console.log('[FF7]', ...a); };
})();

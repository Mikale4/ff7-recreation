// Shops: buy / sell (items, weapons, armour, accessories, materia).
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui, D = FF7.data;

  function priceOf(id) {
    if (id.startsWith && id.startsWith('materia:')) return (D.materia[id.slice(8)] || {}).price || 0;
    const f = U.findItem(id); return f ? f.def.price || 0 : 0;
  }
  function nameOf(id) { return U.itemName(id); }
  function descOf(id) { if (id.startsWith('materia:')) return (D.materia[id.slice(8)] || {}).desc || ''; const f = U.findItem(id); return f ? f.def.desc || '' : ''; }

  class Shop {
    constructor(shopId) {
      this.modal = true; this.done = false;
      const s = D.shops[shopId] || { name: 'Shop', stock: [] };
      this.shop = s;
      this.stock = (s.stock || []).map(id => (s.type === 'materia' || (D.materia[id] && !U.findItem(id))) ? 'materia:' + id : id).filter(id => priceOf(id) > 0 || id.startsWith('materia:'));
      this.mode = 'menu'; this.menuIdx = 0; this.idx = 0; this.top = 0; this.qty = 1; this.msg = null;
      this.aboveFade = false;
    }
    sellList() {
      if (this.shop.type === 'materia') return FF7.state.materia.map((m, i) => ({ materia: m, i, id: 'materia:' + m.id, qty: 1 }));
      return FF7.state.items.filter(e => U.findItem(e.id) && FF7.sys.inv.sellPrice(e.id) > 0).map(e => ({ id: e.id, qty: e.qty }));
    }
    update(focus) {
      if (!focus) return;
      if (this.msg) { if (I.pressed('ok') || I.back()) this.msg = null; return; }
      if (this.mode === 'menu') {
        if (I.repeat('left') || I.repeat('right') || I.repeat('up') || I.repeat('down')) { this.menuIdx = (this.menuIdx + (I.repeat('left') || I.repeat('up') ? 2 : 1)) % 3; FF7.audio.sfx('cursor'); }
        if (I.back()) { FF7.audio.sfx('cancel'); this.done = true; return; }
        if (I.pressed('ok')) { FF7.audio.sfx('confirm'); if (this.menuIdx === 2) { this.done = true; return; } this.mode = this.menuIdx === 0 ? 'buy' : 'sell'; this.idx = 0; this.top = 0; }
        return;
      }
      if (this.mode === 'qty') {
        const max = this.qtyMax;
        if (I.repeat('up') || I.repeat('right')) { this.qty = Math.min(max, this.qty + (I.held('r1') ? 10 : 1)); FF7.audio.sfx('cursor'); }
        if (I.repeat('down') || I.repeat('left')) { this.qty = Math.max(1, this.qty - (I.held('l1') ? 10 : 1)); FF7.audio.sfx('cursor'); }
        if (I.back()) { this.mode = this.qtyFor; FF7.audio.sfx('cancel'); return; }
        if (I.pressed('ok')) this.commit();
        return;
      }
      const L = this.mode === 'buy' ? this.stock : this.sellList();
      if (I.back()) { this.mode = 'menu'; FF7.audio.sfx('cancel'); return; }
      if (!L.length) return;
      if (I.repeat('up')) { this.idx = (this.idx + L.length - 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % L.length; FF7.audio.sfx('cursor'); }
      if (this.idx < this.top) this.top = this.idx; if (this.idx >= this.top + 8) this.top = this.idx - 7;
      if (I.pressed('ok')) {
        if (this.mode === 'buy') {
          const id = L[this.idx], p = priceOf(id);
          const max = id.startsWith('materia:') ? Math.min(99, Math.floor(FF7.state.gil / Math.max(1, p))) : Math.min(99 - FF7.sys.inv.count(id), Math.floor(FF7.state.gil / Math.max(1, p)));
          if (max < 1) { FF7.audio.sfx('error'); this.msg = FF7.state.gil < p ? "You don't have enough gil." : "You can't carry any more."; return; }
          this.qty = 1; this.qtyMax = max; this.qtyFor = 'buy'; this.mode = 'qty'; FF7.audio.sfx('confirm');
        } else {
          const e = L[this.idx];
          this.qty = 1; this.qtyMax = e.qty; this.qtyFor = 'sell'; this.mode = 'qty'; FF7.audio.sfx('confirm');
        }
      }
    }
    commit() {
      if (this.qtyFor === 'buy') {
        const id = this.stock[this.idx], cost = priceOf(id) * this.qty;
        if (!FF7.sys.inv.spendGil(cost)) { FF7.audio.sfx('error'); return; }
        FF7.sys.inv.add(id, this.qty);
        FF7.audio.sfx('purchase');
      } else {
        const L = this.sellList(); const e = L[this.idx];
        if (e.materia) {
          const m = e.materia; const d = D.materia[m.id] || {};
          const val = FF7.sys.materia.isMaster(m) ? (d.sellMaster || Math.floor((d.price || 0) * 1.5)) : Math.floor((d.price || 0) / 2);
          FF7.state.materia.splice(e.i, 1); FF7.sys.inv.addGil(val);
        } else { FF7.sys.inv.remove(e.id, this.qty); FF7.sys.inv.addGil(FF7.sys.inv.sellPrice(e.id) * this.qty); }
        FF7.audio.sfx('purchase');
        if (this.idx >= this.sellList().length) this.idx = Math.max(0, this.idx - 1);
      }
      this.mode = this.qtyFor;
    }
    // FF7 layout (ref: fantasyanime screenshots 01-midgar_133): prompt + shop name on top, a description
    // strip, the item list (5 rows) with prices, a Gil / Owned / Equipped panel, and every member's
    // A/D before -> after preview at the bottom (improvements in yellow)
    render() {
      R.fill('#000', 0.35);
      const buying = this.mode === 'buy' || (this.mode === 'qty' && this.qtyFor === 'buy');
      const prompt = this.mode === 'menu' ? 'Welcome!' : buying ? 'What would you like to buy?' : 'What would you like to sell?';
      R.window(0, 0, 430, 44); R.text(prompt, 18, 12);
      R.window(434, 0, FF7.W - 434, 44); R.text(this.shop.name || 'Shop', (434 + FF7.W) / 2, 12, { align: 'center' });
      if (this.mode === 'menu') {
        R.window(120, 60, 400, 48);
        ['Buy', 'Sell', 'Exit'].forEach((s, i) => { R.text(s, 170 + i * 120, 72); if (i === this.menuIdx) R.cursor(164 + i * 120, 82); });
        R.window(434, 112, FF7.W - 434, 60); R.text('Gil', 452, 120, { size: 15, color: R.COL.cyan }); R.text(U.fmtNum(FF7.state.gil), FF7.W - 16, 142, { align: 'right' });
        return;
      }
      const L = buying ? this.stock : this.sellList();
      const cur = L[this.idx];
      const curId = cur ? (buying ? cur : cur.id) : null;
      R.window(0, 48, FF7.W, 38); R.text(curId ? descOf(curId) : '', 18, 57, { size: 16 });
      // item list
      R.window(0, 90, 430, 196);
      const top = Math.max(0, Math.min(this.idx - 2, L.length - 5));
      L.slice(top, top + 5).forEach((it, k) => {
        const i = top + k, y = 104 + k * 36;
        const id = buying ? it : it.id;
        UI.itemIcon(R.ctx, 52, y + 1, UI.iconKind(id));
        R.text(nameOf(id), 72, y);
        const price = buying ? priceOf(id) : (it.materia ? 0 : FF7.sys.inv.sellPrice(id));
        R.text(U.fmtNum(price), 410, y, { align: 'right' });
        if (i === this.idx) R.cursor(44, y + 10);
      });
      // Gil / Owned / Equipped
      R.window(434, 90, FF7.W - 434, 196);
      R.text('Gil', 452, 102, { size: 16, color: R.COL.cyan }); R.text(U.fmtNum(FF7.state.gil), FF7.W - 18, 124, { align: 'right' });
      if (curId) {
        const owned = curId.startsWith('materia:') ? FF7.state.materia.filter(m => 'materia:' + m.id === curId).length : FF7.sys.inv.count(curId);
        const f0 = U.findItem(curId);
        const equipped = f0 ? FF7.state.members.filter(mid => { const c = FF7.state.chars[mid]; return c && (c.weapon === curId || c.armor === curId || c.accessory === curId); }).length : 0;
        R.text('Owned', 452, 162, { size: 16, color: R.COL.cyan }); R.text(String(owned), FF7.W - 18, 184, { align: 'right' });
        R.text('Equipped', 452, 222, { size: 16, color: R.COL.cyan }); R.text(String(equipped), FF7.W - 18, 244, { align: 'right' });
      }
      // party preview: every member, A (attack) / D (defense) before -> after
      R.window(0, 290, FF7.W, FF7.H - 290);
      const f = curId ? U.findItem(curId) : null;
      // (three columns; four when the Turks make it more than nine; guests left out)
      const members = FF7.state.members.filter(id => !FF7.isGuest(id)).map(id => FF7.state.chars[id]).filter(Boolean).slice(0, 12);
      const cols = members.length > 9 ? 4 : 3, cw = cols === 4 ? 157 : 208;
      members.forEach((c, n) => {
        const col = n % cols, row = Math.floor(n / cols);
        const x = 14 + col * cw, y = 302 + row * 60;
        const slot = f && (f.kind === 'weapon' ? 'weapon' : f.kind === 'armor' ? 'armor' : f.kind === 'accessory' ? 'accessory' : null);
        const can = slot && UI.canEquip ? UI.canEquip(c, slot, curId) : false;
        const img = R.portrait(c.id); if (img) R.img(img, x, y, 48, 48, { alpha: !slot || can ? 1 : 0.35 });
        if (!slot) return;
        if (!can) { R.text('Cannot equip', x + 60, y + 14, { size: 13, color: R.COL.gray }); return; }
        const after = UI.statsWith ? UI.statsWith(c, slot, curId) : c.d;
        [['A', 'atk'], ['D', 'def']].forEach(([lab, k], r) => {
          const yy = y + 2 + r * 22;
          const b = c.d[k], a = after[k];
          const k4 = cols === 4;   // (the narrower cells)
          R.text(lab, x + (k4 ? 54 : 58), yy, { size: 15, color: R.COL.cyan });
          R.text(String(b), x + (k4 ? 98 : 112), yy, { size: 15, align: 'right' });
          R.text('\u2192', x + (k4 ? 102 : 118), yy, { size: 15, color: R.COL.cyan });
          R.text(String(a), x + (k4 ? 146 : 168), yy, { size: 15, align: 'right', color: a > b ? R.COL.yellow : a < b ? R.COL.red : R.COL.white });
        });
      });
      if (this.mode === 'qty') {
        R.window(120, 200, 400, 52);
        const p = this.qtyFor === 'buy' ? priceOf(this.stock[this.idx]) : FF7.sys.inv.sellPrice((L[this.idx] || {}).id || '');
        R.text(`Quantity: ${this.qty}`, 140, 214); R.text(U.fmtNum(p * this.qty) + ' gil', 500, 214, { align: 'right' });
      }
      if (this.msg) { R.window(140, 200, 360, 60); R.text(this.msg, 320, 220, { align: 'center', size: 16 }); }
    }
  }
  UI.openShop = (id) => FF7.sceneMgr.addWidget(new Shop(id));
})();

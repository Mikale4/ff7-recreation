// Equip menu: weapon / armour / accessory with stat comparison.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui, D = FF7.data;
  const ST = FF7.sys.stats;
  const SLOTS = ['weapon', 'armor', 'accessory'];
  const TABLE = { weapon: 'weapons', armor: 'armor', accessory: 'accessories' };
  const GROWTH = ['Nothing', 'Normal', 'Double', 'Triple'];

  function canEquip(c, slot, id) {
    const d = D[TABLE[slot]][id]; if (!d) return false;
    if (slot === 'weapon') return d.char === c.id;
    if (d.chars) return d.chars.includes(c.id) || (d.chars.includes('female') && ['tifa', 'aeris', 'yuffie', 'elena'].includes(c.id)) || (d.chars.includes('male') && !['tifa', 'aeris', 'yuffie', 'elena'].includes(c.id));
    if (c.id === 'redxiii' || c.id === 'caitsith') return slot !== 'weapon' || d.char === c.id;
    return true;
  }
  function statsWith(c, slot, id) {
    const copy = JSON.parse(JSON.stringify({ stats: c.stats, bonus: c.bonus, weapon: c.weapon, armor: c.armor, accessory: c.accessory, weaponMateria: c.weaponMateria, armorMateria: c.armorMateria, maxHpBase: c.maxHpBase, maxMpBase: c.maxMpBase, hp: c.hp, mp: c.mp, id: c.id }));
    copy[slot] = id;
    ST.recalc(copy);
    return copy.d;
  }

  class EquipPanel extends UI.Panel {
    constructor(m, c) { super(m); this.c = c; this.slot = 0; this.mode = 'slot'; this.idx = 0; this.top = 0; }
    options() { const slot = SLOTS[this.slot]; return FF7.state.items.filter(e => U.findItem(e.id) && U.findItem(e.id).kind === slot && canEquip(this.c, slot, e.id)); }
    update() {
      if (this.mode === 'list') return this.updateList();
      if (I.repeat('up')) { this.slot = (this.slot + 2) % 3; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.slot = (this.slot + 1) % 3; FF7.audio.sfx('cursor'); }
      if (I.pressed('l1') || I.pressed('r1')) { const p = this.menu.editable ? this.menu.editable() : this.menu.party(); const i = p.indexOf(this.c); this.c = p[(i + (I.pressed('l1') ? -1 : 1) + p.length) % p.length]; FF7.audio.sfx('cursor'); }
      if (I.pressed('menu') && SLOTS[this.slot] === 'accessory' && this.c.accessory) { ST.equip(this.c, 'accessory', null); FF7.audio.sfx('equip'); return; }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('ok')) { if (!this.options().length) { FF7.audio.sfx('error'); return; } this.mode = 'list'; this.idx = 0; this.top = 0; FF7.audio.sfx('confirm'); }
    }
    updateList() {
      const L = this.options();
      if (I.back()) { this.mode = 'slot'; FF7.audio.sfx('cancel'); return; }
      if (!L.length) { this.mode = 'slot'; return; }
      if (I.repeat('up')) { this.idx = (this.idx + L.length - 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % L.length; FF7.audio.sfx('cursor'); }
      if (this.idx < this.top) this.top = this.idx; if (this.idx >= this.top + 8) this.top = this.idx - 7;
      if (I.pressed('ok')) { ST.equip(this.c, SLOTS[this.slot], L[this.idx].id); FF7.audio.sfx('equip'); this.mode = 'slot'; }
    }
    render() {
      const c = this.c;
      R.window(0, 0, FF7.W, 120);
      UI.drawCharBlock(c, 14, 14, { small: true });
      SLOTS.forEach((s, i) => {
        const y = 14 + i * 32;
        R.text(['Wpn.', 'Arm.', 'Acc.'][i], 270, y, { size: 15, color: R.COL.cyan });
        if (c[s]) { UI.itemIcon(R.ctx, 330, y + 1, UI.iconKind(c[s])); R.text(U.itemName(c[s]), 350, y); }
        if (i === this.slot) R.cursor(264, y + 10, { alpha: this.mode === 'slot' ? 1 : 0.5 });
      });
      const L = this.options();
      const sel = this.mode === 'list' ? L[this.idx] : null;
      const selId = sel ? sel.id : c[SLOTS[this.slot]];
      const f = selId ? U.findItem(selId) : null;
      R.window(0, 124, FF7.W, 38); R.text(f ? (f.def.desc || '') : '', 20, 133, { size: 16 });
      // slots & growth preview
      R.window(0, 166, 340, 90);
      if (f && (f.kind === 'weapon' || f.kind === 'armor')) {
        R.text('Slot', 16, 176, { size: 14, color: R.COL.cyan });
        // the equipped item shows the materia in its slots; a candidate from the list shows its empty slots
        const mk = { weapon: 'weaponMateria', armor: 'armorMateria' }[SLOTS[this.slot]];
        const arr = new Array(f.def.slots || 0).fill(null);
        if (mk && selId === c[SLOTS[this.slot]] && !sel) (c[mk] || []).forEach((m, i) => { if (i < arr.length) arr[i] = m; });
        UI.drawSlots(80, 186, arr, f.def.links || 0, -1);
        R.text('Growth', 16, 212, { size: 14, color: R.COL.cyan }); R.text(GROWTH[f.def.growth != null ? f.def.growth : 1], 90, 212, { size: 15 });
      }
      // stats comparison
      R.window(0, 260, 340, 220);
      const cur = c.d, nxt = sel ? statsWith(c, SLOTS[this.slot], sel.id) : null;
      const rows = [['Attack', 'atk'], ['Attack%', 'hit'], ['Defense', 'def'], ['Defense%', 'defPct'], ['Magic atk', 'mat'], ['Magic def', 'mdf'], ['Magic def%', 'mdfPct']];
      rows.forEach(([lab, k], i) => {
        const y = 272 + i * 28;
        R.text(lab, 16, y, { size: 15, color: R.COL.cyan });
        R.text(String(cur[k]), 200, y, { align: 'right', size: 16 });
        if (nxt) { R.text('→', 222, y, { size: 16 }); R.text(String(nxt[k]), 310, y, { align: 'right', size: 16, color: nxt[k] > cur[k] ? R.COL.yellow : nxt[k] < cur[k] ? R.COL.red : R.COL.white }); }
      });
      // options list
      R.window(344, 166, 296, 314);
      L.slice(this.top, this.top + 8).forEach((e, k) => {
        const i = this.top + k, y = 180 + k * 36;
        UI.itemIcon(R.ctx, 374, y + 1, UI.iconKind(e.id));
        R.text(U.itemName(e.id), 394, y); R.text(String(e.qty), 624, y, { align: 'right', size: 15 });
        if (this.mode === 'list' && i === this.idx) R.cursor(368, y + 10);
      });
      if (!L.length) R.text('(nothing to equip)', 374, 180, { color: R.COL.gray });
    }
  }
  UI.EquipPanel = EquipPanel;
  UI.canEquip = canEquip; UI.statsWith = statsWith;
})();

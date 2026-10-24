// Materia menu (FF7 layout): character + weapon / armour slots on top with the Check and Arrange
// commands in a box at the top right, a description strip, the highlighted materia's details
// bottom-left (level stars in the materia's colour, AP, ability list, equip effects) and the materia
// list bottom-right.
//   slots   : arrows move (Up from the weapon row / Down from the armour row reach Check / Arrange),
//             OK = choose materia from the list, Triangle = remove one, Square = remove all, L1/R1 = character
//   Check   : pick a slot -> the character's battle commands and the Magic / Summon / E.Skill lists
//             (abilities not learned yet are greyed); the list opens on the picked materia
//   Arrange : Arrange (sort the list by type) / Exchange (swap slots between characters) /
//             Remove all / Trash (throw away a listed materia, after a Yes / No)
// Equipping goes through FF7.sys.materia (toStock / unequipAll) and FF7.sys.stats.recalc, so AP,
// equip effects and stats stay right.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui, D = FF7.data;
  const M = FF7.sys.materia;
  const STOCK_MAX = 200;                     // FF7's materia list size (js/systems/materia.js)
  const TYPE_ORDER = ['magic', 'support', 'command', 'independent', 'summon'];     // FF7 Arrange order
  const ARRANGE = ['Arrange', 'Exchange', 'Remove all', 'Trash'];
  const ARRANGE_HELP = ['Sort the materia list by type', 'Exchange materia with another character', 'Remove all of this character\'s materia', 'Throw away materia'];
  const CMD_HELP = ['Check the abilities the equipped materia give', 'Arrange, exchange, remove or throw away materia'];
  const EFFECTS = [['str', 'Strength'], ['dex', 'Dexterity'], ['vit', 'Vitality'], ['mag', 'Magic'], ['spr', 'Spirit'], ['lck', 'Luck'], ['hpPct', 'MaxHP', '%'], ['mpPct', 'MaxMP', '%']];
  const LIST_CMDS = { magic: 'magic', w_magic: 'magic', summon: 'summon', w_summon: 'summon', enemy_skill: 'eskill' };
  const LIST_ROWS = 10, SLOT_X = 290, SLOT_Y = [52, 106], CMD_X = FF7.W - 112;
  const slotX = (x, i) => x + 10 + i * 29;   // centre of slot i as drawn by UI.drawSlots

  UI.drawOrb = function (x, y, m, r = 9) { if (m) UI.orb(R.ctx, x, y, r, M.color(m.id)); };
  // Materia slots, FF7 style: thick silver rings around dark holes; linked pairs joined by a metal bar
  // drawn between (and behind) the rings. arr: slot contents (null = empty), links: number of linked pairs.
  UI.drawSlots = function (x, y, arr, links, sel) {
    const c = R.ctx, n = arr.length;
    const r = 10, ring = 3.2, step = 2 * r + 9;       // slot radius, ring width, centre spacing
    const cx = (i) => x + r + i * step;
    c.save();
    // link bars first, so the rings overlap their ends
    for (let k = 0; k < links && 2 * k + 1 < n; k++) {
      const x0 = cx(2 * k), x1 = cx(2 * k + 1), bh = r * 0.62;
      const g = c.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
      g.addColorStop(0, '#f0f0f6'); g.addColorStop(0.45, '#9a9aa6'); g.addColorStop(1, '#5c5c68');
      c.fillStyle = g; c.fillRect(x0, y - bh / 2, x1 - x0, bh);
      c.strokeStyle = '#3a3a44'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y - bh / 2 + 0.5, x1 - x0 - 1, bh - 1);
    }
    for (let i = 0; i < n; i++) {
      const X = cx(i);
      // metallic ring
      const g = c.createLinearGradient(X - r, y - r, X + r, y + r);
      g.addColorStop(0, '#f4f4fa'); g.addColorStop(0.5, '#a8a8b4'); g.addColorStop(1, '#55555f');
      c.fillStyle = g; c.beginPath(); c.arc(X, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2c2c34'; c.lineWidth = 1; c.stroke();
      // dark recessed hole
      const h = c.createRadialGradient(X + 1.5, y + 1.5, 0.5, X, y, r - ring);
      h.addColorStop(0, '#3c3c46'); h.addColorStop(1, '#101016');
      c.fillStyle = h; c.beginPath(); c.arc(X, y, r - ring, 0, Math.PI * 2); c.fill();
      if (arr[i]) UI.drawOrb(X, y, arr[i], r - ring - 0.5);
      if (sel === i) R.cursor(X - r - 2, y);
    }
    c.restore();
  };

  // Level stars in the materia's own colour (FF7): lit for the levels reached, dark hollow ones for
  // the rest; MASTER lights them all with a white glint. opts: size, align ('right' = x is the right
  // edge). Returns the width drawn.
  function star(c, cx, cy, r, col, lit, glint) {
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.46 : r;
      if (k) c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath();
    if (lit) {
      const g = c.createLinearGradient(0, cy - r, 0, cy + r);
      g.addColorStop(0, U.shade(col, 0.8)); g.addColorStop(0.45, U.shade(col, 0.3)); g.addColorStop(1, col);
      c.fillStyle = g; c.fill();
      c.strokeStyle = U.shade(col, -0.7); c.lineWidth = 1; c.stroke();
      if (glint) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx - r * 0.2, cy - r * 0.22, r * 0.22, 0, Math.PI * 2); c.fill(); }
    } else {
      c.fillStyle = U.shade(col, -0.88); c.fill();
      c.strokeStyle = U.shade(col, -0.45); c.lineWidth = 1; c.stroke();
    }
  }
  UI.drawStars = function (x, y, m, opts = {}) {
    const d = M.def(m); if (!d) return 0;
    const size = opts.size || 14, step = size + 2, n = M.maxLevel(d), lv = M.level(m), master = M.isMaster(m), col = M.color(m.id);
    const w = n * step - 2;
    if (opts.align === 'right') x -= w;
    const c = R.ctx;
    c.save();
    for (let i = 0; i < n; i++) star(c, x + i * step + size / 2, y + size / 2, size / 2, col, i < lv, master);
    c.restore();
    return w;
  };
  UI.materiaAbilities = function (m) {
    const d = M.def(m); if (!d) return [];
    const lv = M.level(m);
    if (d.type === 'magic') return (d.spells || []).map(([s, l]) => ({ name: (D.spells[s] || {}).name || s, ok: lv >= l }));
    if (d.type === 'summon' && d.summons) return d.summons.map(s => ({ name: (D.summons[s] || {}).name || s, ok: true }));
    if (d.type === 'summon') return [{ name: (D.summons[d.summon] || {}).name || d.name, ok: true }, { name: `Uses per battle: ${M.isMaster(m) ? '∞' : lv}`, ok: true }];
    if (m.id === 'enemy_skill') return Object.keys(D.eskills).map(k => ({ name: (m.eskills || []).includes(k) ? D.eskills[k].name : '--------', ok: (m.eskills || []).includes(k) }));
    if (d.type === 'command') return (d.commands || [[m.id, 1]]).map(([c, l]) => ({ name: (FF7.battle.CMD_NAMES[c] || c), ok: lv >= l }));
    return [{ name: d.desc || d.name, ok: true }];
  };
  // Equip effects as FF7 words them: "Strength -1", "Magic +1", "MaxHP -2%"
  UI.materiaEffects = function (m) {
    const d = M.def(m), s = (d && d.stats) || {};
    return EFFECTS.filter(([k]) => s[k]).map(([k, name, pct]) => ({ name, value: (s[k] > 0 ? '+' : '') + s[k] + (pct || '') }));
  };

  // What a character can use from the equipped materia (Check): the battle command layout (FF7:
  // Attack / Magic / Summon / Item in the first column, other commands after) and the Magic / Summon
  // / E.Skill lists. Entries not learned yet have ok = false; src = the materia that grants them.
  UI.checkInfo = function (c) {
    const ab = M.abilities(c), order = Object.keys(D.spells);
    const spells = {}, cmdSrc = {};
    const addSpell = (id, ok, src) => {
      const def = D.spells[id]; if (!def) return null;
      const e = spells[id] || (spells[id] = { id, def, name: def.name, mp: def.mp || 0, ok: false, src: null });
      if (ok && !e.ok) { e.ok = true; if (src) e.src = src; }
      if (!e.src) e.src = src;
      return e;
    };
    const eskMat = [];
    for (const m of M.equippedList(c)) {
      const d = M.def(m); if (!d) continue;
      const lv = M.level(m);
      if (d.type === 'magic') { (d.spells || []).forEach(([s, l]) => addSpell(s, m.id === 'master_magic' || lv >= l, m)); cmdSrc.magic = cmdSrc.magic || m; }
      else if (d.type === 'summon') cmdSrc.summon = cmdSrc.summon || m;
      else if (d.type === 'command') {
        if (m.id === 'enemy_skill') eskMat.push(m);
        (d.commands || [[m.id, 1]]).forEach(([id]) => { cmdSrc[id] = cmdSrc[id] || m; });
      }
    }
    ab.spells.forEach(s => { const e = addSpell(s.id, true, null); if (e && (s.supports || []).some(x => x.id === 'all')) e.all = true; });
    const magic = Object.keys(spells).map(k => spells[k]).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const summon = ab.summons.filter(s => D.summons[s.id]).map(s => ({ id: s.id, def: D.summons[s.id], name: D.summons[s.id].name, mp: D.summons[s.id].mp || 0, ok: true, src: s.inst, uses: s.uses }));
    const known = new Set(ab.eskills);
    const eskill = eskMat.length ? Object.keys(D.eskills).map(k => ({ id: k, def: D.eskills[k], name: known.has(k) ? D.eskills[k].name : '--------', mp: D.eskills[k].mp || 0, ok: known.has(k),
      src: eskMat.find(m => (m.eskills || []).includes(k)) || eskMat[0] })) : [];
    const cmds = ab.commands;
    const slot = (list) => cmds.find(x => list.includes(x)) || null;
    const col0 = [slot(['attack', 'slash_all', 'flash', 'double_cut', '4x_cut']), slot(['magic', 'w_magic']), slot(['summon', 'w_summon']), slot(['item', 'w_item'])];
    const rest = cmds.filter(x => !col0.includes(x));
    const cells = [col0];
    for (let i = 0; i < rest.length; i += 4) cells.push(rest.slice(i, i + 4).concat([null, null, null, null]).slice(0, 4));
    return { cells, cmdSrc, lists: { magic, summon, eskill } };
  };

  // ---------------------------------------------------------------- Arrange sub-commands
  // Arrange: sort the list by type (magic, support, command, independent, summon), then in FF7's
  // materia order, higher AP first. Sorts FF7.state.materia in place.
  UI.arrangeMateria = function () {
    const S = FF7.state.materia, ids = Object.keys(D.materia);
    const key = (m) => { const d = M.def(m), t = TYPE_ORDER.indexOf(d ? d.type : ''), n = ids.indexOf(m.id); return [t < 0 ? 99 : t, n < 0 ? 9999 : n]; };
    const L = S.filter(Boolean).sort((a, b) => { const ka = key(a), kb = key(b); return ka[0] - kb[0] || ka[1] - kb[1] || b.ap - a.ap; });
    S.length = 0; L.forEach(m => S.push(m));
    return S;
  };
  // Exchange: swap two slots { c, key: 'weaponMateria' | 'armorMateria', i } (any characters, one may be
  // empty) and recompute both characters' stats. Returns false if nothing moved.
  UI.exchangeMateria = function (a, b) {
    const A = a.c[a.key], B = b.c[b.key];
    if (!A || !B || a.i >= A.length || b.i >= B.length || (!A[a.i] && !B[b.i])) return false;
    const t = A[a.i]; A[a.i] = B[b.i]; B[b.i] = t;
    FF7.sys.stats.recalc(a.c);
    if (b.c !== a.c) FF7.sys.stats.recalc(b.c);
    return true;
  };
  // Remove all: everything back to the list through M.unequipAll (refused if the list can't hold it)
  UI.removeAllMateria = function (c) {
    const n = M.equippedList(c).length;
    if (!n || FF7.state.materia.length + n > STOCK_MAX) return false;
    M.unequipAll(c);
    return true;
  };
  // Trash: throw away the listed materia at index i
  UI.trashMateria = function (i) { const S = FF7.state.materia; return i >= 0 && i < S.length ? S.splice(i, 1)[0] : null; };

  function scrollbar(x, y, h, top, total, rows) {
    const c = R.ctx;
    c.fillStyle = '#1c1c50'; c.fillRect(x, y, 10, h);
    const th = Math.max(14, h * Math.min(1, rows / total)), ty = y + (h - th) * (total > rows ? top / (total - rows) : 0);
    c.fillStyle = '#c8c8d8'; c.fillRect(x + 1, ty, 8, th);
  }

  class MateriaPanel extends UI.Panel {
    constructor(m, c) {
      super(m); this.c = c;
      this.row = 0; this.col = 0;           // slot cursor (row 0 = weapon, 1 = armour)
      this.mode = 'slots';                  // slots | cmd | stock | check | checkView | arrange | exchange | trash | confirm
      this.cmd = 0; this.arrIdx = 0;        // Check / Arrange box; Arrange sub-menu
      this.idx = 0; this.top = 0;           // materia list
      this.yes = 1;                         // trash confirmation: 0 = Yes, 1 = No
      this.chk = null; this.ex = null;
    }
    arr(row) { return row === 0 ? this.c.weaponMateria : this.c.armorMateria; }
    fitCol() { this.col = Math.min(this.col, Math.max(0, this.arr(this.row).length - 1)); }
    fitList() {
      const n = FF7.state.materia.length;
      this.idx = U.clamp(this.idx, 0, Math.max(0, n - 1));
      if (this.idx < this.top) this.top = this.idx;
      if (this.idx >= this.top + LIST_ROWS) this.top = this.idx - LIST_ROWS + 1;
      this.top = U.clamp(this.top, 0, Math.max(0, n - LIST_ROWS));
    }
    listCursor() {
      const n = FF7.state.materia.length;
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; FF7.audio.sfx('cursor'); }
      this.fitList();
    }
    cycleChar(d) { const p = this.menu.editable ? this.menu.editable() : this.menu.party(); const i = p.indexOf(this.c); this.c = p[(i + d + p.length) % p.length]; this.fitCol(); FF7.audio.sfx('cursor'); }
    update() {
      switch (this.mode) {
        case 'cmd': return this.updateCmd();
        case 'stock': return this.updateStock();
        case 'check': return this.updateSlots(true);
        case 'checkView': return this.updateCheck();
        case 'arrange': return this.updateArrange();
        case 'exchange': return this.updateExchange();
        case 'trash': return this.updateTrash();
        case 'confirm': return this.updateConfirm();
        default: return this.updateSlots(false);
      }
    }
    // Slot cursor. checking = picking the slot to Check (no editing; Cancel returns to the Check command).
    updateSlots(checking) {
      const c = this.c, arr = this.arr(this.row);
      if (I.repeat('left')) { this.col = Math.max(0, this.col - 1); FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { this.col = Math.min(Math.max(0, arr.length - 1), this.col + 1); FF7.audio.sfx('cursor'); }
      if (I.repeat('up')) {
        FF7.audio.sfx('cursor');
        if (this.row === 0 && !checking) { this.mode = 'cmd'; this.cmd = 1; return; }
        this.row = 1 - this.row; this.fitCol();
      }
      if (I.repeat('down')) {
        FF7.audio.sfx('cursor');
        if (this.row === 1 && !checking) { this.mode = 'cmd'; this.cmd = 0; return; }
        this.row = 1 - this.row; this.fitCol();
      }
      if (I.pressed('l1')) { this.cycleChar(-1); return; }
      if (I.pressed('r1')) { this.cycleChar(1); return; }
      if (checking) {
        if (I.back()) { this.mode = 'cmd'; this.cmd = 0; FF7.audio.sfx('cancel'); return; }
        if (I.pressed('ok')) { FF7.audio.sfx('confirm'); this.openCheck(this.arr(this.row)[this.col]); }
        return;
      }
      if (I.pressed('square')) { FF7.audio.sfx(UI.removeAllMateria(c) ? 'set' : 'error'); return; }     // remove all
      if (I.pressed('menu') || I.pressed('cancel')) {
        const cur = this.arr(this.row)[this.col];
        if (I.pressed('menu') && cur) {        // Triangle: remove this one
          if (M.toStock(cur) === false) { FF7.audio.sfx('error'); return; }
          this.arr(this.row)[this.col] = null; FF7.sys.stats.recalc(c); FF7.audio.sfx('set'); return;
        }
        FF7.audio.sfx('cancel'); this.close(); return;
      }
      if (I.pressed('ok')) { if (!arr.length) { FF7.audio.sfx('error'); return; } this.mode = 'stock'; this.idx = 0; this.top = 0; FF7.audio.sfx('confirm'); }
    }
    // Check / Arrange box: Up/Down continue the slots' vertical ring, Left goes back to the weapon row
    updateCmd() {
      if (I.repeat('up')) { FF7.audio.sfx('cursor'); if (this.cmd === 1) this.cmd = 0; else { this.mode = 'slots'; this.row = 1; this.fitCol(); } return; }
      if (I.repeat('down')) { FF7.audio.sfx('cursor'); if (this.cmd === 0) this.cmd = 1; else { this.mode = 'slots'; this.row = 0; this.fitCol(); } return; }
      if (I.repeat('left')) { FF7.audio.sfx('cursor'); this.mode = 'slots'; this.row = 0; this.col = Math.max(0, this.arr(0).length - 1); return; }
      if (I.pressed('l1')) { this.cycleChar(-1); return; }
      if (I.pressed('r1')) { this.cycleChar(1); return; }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('ok')) {
        FF7.audio.sfx('confirm');
        if (this.cmd === 0) { this.mode = 'check'; this.fitCol(); } else { this.mode = 'arrange'; this.arrIdx = 0; }
      }
    }
    updateStock() {
      const S = FF7.state.materia;
      if (I.back()) { this.mode = 'slots'; FF7.audio.sfx('cancel'); return; }
      if (!S.length) return;
      this.listCursor();
      if (I.pressed('ok')) {
        const arr = this.arr(this.row);
        const take = S.splice(this.idx, 1)[0];
        const old = arr[this.col];
        arr[this.col] = take;
        if (old) S.splice(this.idx, 0, old);
        FF7.sys.stats.recalc(this.c);
        FF7.audio.sfx('equip');
        this.mode = 'slots';
        this.fitList();
      }
    }

    // ---------------------------------------------------------------- Check
    openCheck(m) {
      const info = UI.checkInfo(this.c), cells = [];
      info.cells.forEach((col, ci) => col.forEach((id, ri) => { if (id) cells.push({ id, col: ci, row: ri }); }));
      const chk = this.chk = { info, cells, ci: 0, focus: 'cmd', li: 0, top: 0 };
      const d = M.def(m);
      let want = null;
      if (d && m.id === 'enemy_skill') want = ['enemy_skill'];
      else if (d && d.type === 'magic') want = ['magic', 'w_magic'];
      else if (d && d.type === 'summon') want = ['summon', 'w_summon'];
      else if (d && d.type === 'command') want = (d.commands || [[m.id, 1]]).map(x => x[0]);
      if (want) { const i = cells.findIndex(e => want.includes(e.id)); if (i >= 0) chk.ci = i; }
      const L = this.checkList();
      if (L.length && want && LIST_CMDS[cells[chk.ci].id]) {   // open the list on the picked materia's first ability
        chk.focus = 'list'; chk.li = Math.max(0, L.findIndex(e => e.src === m)); this.fitCheckTop();
      }
      this.mode = 'checkView';
    }
    checkList() { const e = this.chk.cells[this.chk.ci], k = e && LIST_CMDS[e.id]; return k ? this.chk.info.lists[k] : []; }
    fitCheckTop() { const chk = this.chk, r = Math.floor(chk.li / 3); if (r < chk.top) chk.top = r; if (r >= chk.top + 5) chk.top = r - 4; }
    checkMove(dx, dy) {
      const chk = this.chk, cells = chk.cells, cur = cells[chk.ci];
      if (!cur) return;
      let to;
      if (dy) {
        const col = cells.filter(e => e.col === cur.col).sort((a, b) => a.row - b.row);
        to = col[(col.indexOf(cur) + dy + col.length) % col.length];
      } else {
        const n = Math.max(...cells.map(e => e.col)) + 1, tc = (cur.col + dx + n) % n;
        to = cells.filter(e => e.col === tc).sort((a, b) => Math.abs(a.row - cur.row) - Math.abs(b.row - cur.row))[0];
      }
      if (to && to !== cur) { chk.ci = cells.indexOf(to); FF7.audio.sfx('cursor'); }
    }
    updateCheck() {
      const chk = this.chk;
      if (chk.focus === 'list') {
        const L = this.checkList(), n = L.length;
        if (I.back() || !n) { chk.focus = 'cmd'; FF7.audio.sfx('cancel'); return; }
        if (I.repeat('up')) { chk.li = (chk.li + n - 3) % n; FF7.audio.sfx('cursor'); }
        if (I.repeat('down')) { chk.li = (chk.li + 3) % n; FF7.audio.sfx('cursor'); }
        if (I.repeat('left')) { chk.li = (chk.li + n - 1) % n; FF7.audio.sfx('cursor'); }
        if (I.repeat('right')) { chk.li = (chk.li + 1) % n; FF7.audio.sfx('cursor'); }
        this.fitCheckTop();
        return;
      }
      if (I.back()) { this.mode = 'check'; FF7.audio.sfx('cancel'); return; }
      if (I.repeat('up')) this.checkMove(0, -1);
      if (I.repeat('down')) this.checkMove(0, 1);
      if (I.repeat('left')) this.checkMove(-1, 0);
      if (I.repeat('right')) this.checkMove(1, 0);
      if (I.pressed('ok')) {
        if (!this.checkList().length) { FF7.audio.sfx('error'); return; }
        chk.focus = 'list'; chk.li = 0; chk.top = 0; FF7.audio.sfx('confirm');
      }
    }

    // ---------------------------------------------------------------- Arrange / Exchange / Remove all / Trash
    updateArrange() {
      if (I.repeat('up')) { this.arrIdx = (this.arrIdx + ARRANGE.length - 1) % ARRANGE.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.arrIdx = (this.arrIdx + 1) % ARRANGE.length; FF7.audio.sfx('cursor'); }
      if (I.back()) { this.mode = 'cmd'; FF7.audio.sfx('cancel'); return; }
      if (!I.pressed('ok')) return;
      if (this.arrIdx === 0) { UI.arrangeMateria(); this.idx = 0; this.top = 0; FF7.audio.sfx('set'); }
      else if (this.arrIdx === 1) this.openExchange();
      else if (this.arrIdx === 2) FF7.audio.sfx(UI.removeAllMateria(this.c) ? 'set' : 'error');
      else if (!FF7.state.materia.length) FF7.audio.sfx('error');
      else { this.mode = 'trash'; this.fitList(); FF7.audio.sfx('confirm'); }
    }
    // Everyone who can hold materia: the active party first, then the reserve
    exMembers() {
      const st = FF7.state;
      return st.party.filter(Boolean).concat(st.members.filter(id => !st.party.includes(id))).map(id => st.chars[id]).filter(c => c && !FF7.isGuest(c.id));
    }
    exRows() { const out = []; this.exMembers().forEach(c => ['weaponMateria', 'armorMateria'].forEach(key => { if ((c[key] || []).length) out.push({ c, key }); })); return out; }
    openExchange() {
      const rows = this.exRows();
      if (!rows.length) { FF7.audio.sfx('error'); return; }
      this.ex = { ri: Math.max(0, rows.findIndex(r => r.c === this.c)), col: 0, top: 0, pick: null };
      this.fitExTop(rows); this.mode = 'exchange'; FF7.audio.sfx('confirm');
    }
    fitExTop(rows) {
      const ex = this.ex, mi = this.exMembers().indexOf(rows[ex.ri].c);
      if (mi < ex.top) ex.top = mi;
      if (mi >= ex.top + 3) ex.top = mi - 2;
    }
    updateExchange() {
      const ex = this.ex, rows = this.exRows(), n = rows.length;
      if (I.back()) { FF7.audio.sfx('cancel'); if (ex.pick) ex.pick = null; else this.mode = 'arrange'; return; }
      if (!n) return;
      if (I.repeat('up')) { ex.ri = (ex.ri + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { ex.ri = (ex.ri + 1) % n; FF7.audio.sfx('cursor'); }
      ex.ri = Math.min(ex.ri, n - 1);
      const row = rows[ex.ri], len = row.c[row.key].length;
      if (I.repeat('left')) { ex.col = Math.max(0, ex.col - 1); FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { ex.col = Math.min(len - 1, ex.col + 1); FF7.audio.sfx('cursor'); }
      ex.col = Math.min(ex.col, len - 1);
      this.fitExTop(rows);
      if (!I.pressed('ok')) return;
      const here = { c: row.c, key: row.key, i: ex.col };
      if (!ex.pick) { ex.pick = here; FF7.audio.sfx('confirm'); return; }
      const a = ex.pick; ex.pick = null;
      if (a.c === here.c && a.key === here.key && a.i === here.i) { FF7.audio.sfx('cancel'); return; }
      FF7.audio.sfx(UI.exchangeMateria(a, here) ? 'equip' : 'error');
    }
    updateTrash() {
      if (I.back()) { this.mode = 'arrange'; FF7.audio.sfx('cancel'); return; }
      if (!FF7.state.materia.length) { this.mode = 'arrange'; return; }
      this.listCursor();
      if (I.pressed('ok')) { this.mode = 'confirm'; this.yes = 1; FF7.audio.sfx('confirm'); }
    }
    updateConfirm() {
      if (I.repeat('up') || I.repeat('down')) { this.yes = 1 - this.yes; FF7.audio.sfx('cursor'); }
      if (I.back()) { this.mode = 'trash'; FF7.audio.sfx('cancel'); return; }
      if (!I.pressed('ok')) return;
      if (this.yes === 0) { UI.trashMateria(this.idx); FF7.audio.sfx('set'); this.fitList(); } else FF7.audio.sfx('cancel');
      this.mode = FF7.state.materia.length ? 'trash' : 'arrange';
    }

    // ---------------------------------------------------------------- render
    selected() {
      if (this.mode === 'stock' || this.mode === 'trash' || this.mode === 'confirm') return FF7.state.materia[this.idx] || null;
      if (this.mode === 'slots' || this.mode === 'check') return this.arr(this.row)[this.col] || null;
      return null;
    }
    help() {
      if (this.mode === 'cmd') return CMD_HELP[this.cmd];
      if (this.mode === 'arrange') return ARRANGE_HELP[this.arrIdx];
      if (this.mode === 'checkView') {
        const chk = this.chk, e = chk.focus === 'list' ? this.checkList()[chk.li] : null;
        if (e) return e.ok ? (e.def.desc || '') : '';
        const cur = chk.cells[chk.ci], src = cur && chk.info.cmdSrc[cur.id];
        return src ? (M.def(src).desc || '') : '';
      }
      const m = this.selected();
      return m ? ((M.def(m) || {}).desc || '') : this.mode === 'check' ? CMD_HELP[0] : '';
    }
    render() {
      const c = this.c, mode = this.mode;
      if (mode === 'exchange') return this.renderExchange();
      R.window(0, 0, FF7.W, 132);
      UI.drawCharBlock(c, 14, 14, { small: true });
      const w = FF7.sys.stats.weapon(c), a = FF7.sys.stats.armor(c);
      const sel = (row) => (mode === 'slots' || mode === 'check') && this.row === row ? this.col : -1;
      R.text('Wpn.', 270, 16, { size: 14, color: R.COL.cyan }); R.text(w ? w.name : '', 320, 16, { size: 15 });
      UI.drawSlots(SLOT_X, SLOT_Y[0], c.weaponMateria, w ? w.links || 0 : 0, sel(0));
      R.text('Arm.', 270, 70, { size: 14, color: R.COL.cyan }); R.text(a ? a.name : '', 320, 70, { size: 15 });
      UI.drawSlots(SLOT_X, SLOT_Y[1], c.armorMateria, a ? a.links || 0 : 0, sel(1));
      // the slot being filled (list) or checked keeps a still cursor
      if ((mode === 'stock' || mode === 'checkView') && this.col < this.arr(this.row).length) R.cursor(slotX(SLOT_X, this.col) - 12, SLOT_Y[this.row], { still: true, alpha: 0.5 });
      // Check / Arrange (FF7: top right)
      R.window(CMD_X, 0, FF7.W - CMD_X, 64);
      R.text('Check', CMD_X + 28, 9); R.text('Arrange', CMD_X + 28, 34);
      if (mode === 'cmd') R.cursor(CMD_X + 22, 19 + this.cmd * 25);
      else if (mode === 'check' || mode === 'checkView') R.cursor(CMD_X + 22, 19, { still: true, alpha: 0.5 });
      else if (mode === 'arrange' || mode === 'trash' || mode === 'confirm') R.cursor(CMD_X + 22, 44, { still: true, alpha: 0.5 });
      R.window(0, 136, FF7.W, 38); R.text(this.help(), 16, 145, { size: 16 });
      if (mode === 'checkView') this.renderCheck();
      else { this.renderInfo(this.selected()); this.renderList(mode === 'stock' || mode === 'trash' || mode === 'confirm'); }
      if (mode === 'arrange' || mode === 'trash' || mode === 'confirm') {
        R.window(FF7.W - 150, 60, 150, 122);
        ARRANGE.forEach((s, i) => R.text(s, FF7.W - 122, 70 + i * 26));
        if (mode === 'arrange') R.cursor(FF7.W - 128, 80 + this.arrIdx * 26);
        else R.cursor(FF7.W - 128, 80 + 3 * 26, { still: true, alpha: 0.5 });
      }
      if (mode === 'confirm') {
        const m = FF7.state.materia[this.idx];
        R.window(170, 250, 300, 104);
        R.text(`Throw away ${m ? (M.def(m) || {}).name || m.id : ''}?`, 320, 262, { align: 'center', size: 16 });
        R.text('Yes', 300, 290); R.text('No', 300, 318); R.cursor(294, 300 + this.yes * 28);
      }
    }
    // Details of one materia (bottom-left): name, stars, AP, ability list, equip effects
    renderInfo(m) {
      R.window(0, 178, 380, 302);
      if (!m) return;
      const d = M.def(m);
      UI.drawOrb(26, 200, m, 11);
      R.text(d ? d.name : m.id, 44, 190);
      UI.drawStars(364, 192, m, { align: 'right' });
      R.text('AP', 30, 222, { size: 14, color: R.COL.cyan }); R.text(M.isMaster(m) ? 'MASTER' : U.fmtNum(m.ap), 200, 220, { align: 'right', size: 16 });
      if (!M.isMaster(m) && d && d.ap && d.ap.length) { R.text('To next level', 214, 222, { size: 14, color: R.COL.cyan }); R.text(U.fmtNum(M.apToNext(m)), 364, 240, { align: 'right', size: 16 }); }
      const abil = UI.materiaAbilities(m), eff = UI.materiaEffects(m);
      R.text('Ability List', 30, 266, { size: 14, color: R.COL.cyan });
      const cols = eff.length ? 1 : Math.min(3, Math.max(1, Math.ceil(abil.length / 8))), colW = 324 / cols, size = cols > 2 ? 13 : 15;
      abil.slice(0, cols * 8).forEach((ab, i) => R.text(ab.name, 40 + Math.floor(i / 8) * colW, 290 + (i % 8) * 22, { size, color: ab.ok ? R.COL.white : R.COL.gray }));
      if (eff.length) {
        R.text('Equip effects', 214, 266, { size: 14, color: R.COL.cyan });
        eff.forEach((e, i) => { R.text(e.name, 224, 290 + i * 22, { size: 15 }); R.text(e.value, 364, 290 + i * 22, { size: 15, align: 'right' }); });
      }
    }
    renderList(cursorOn) {
      R.window(384, 178, 256, 302);
      const S = FF7.state.materia;
      S.slice(this.top, this.top + LIST_ROWS).forEach((m, k) => {
        const i = this.top + k, y = 192 + k * 28;
        UI.drawOrb(406, y + 10, m);
        R.text((M.def(m) || {}).name || m.id, 422, y, { size: 16 });
        if (cursorOn && i === this.idx) R.cursor(398, y + 10, { still: this.mode === 'confirm' });
      });
      if (!S.length) R.text('(no materia)', 410, 192, { color: R.COL.gray });
      if (S.length > LIST_ROWS) scrollbar(620, 190, 278, this.top, S.length, LIST_ROWS);
    }
    // Check: command window like the battle menu, the source materia + MP box, and the ability list
    renderCheck() {
      const chk = this.chk, c = this.c, cw = 118 * chk.info.cells.length + 24;
      R.window(0, 178, cw, 122);
      chk.cells.forEach((e, i) => {
        const x = 30 + e.col * 118, y = 188 + e.row * 26;
        R.text(FF7.battle.CMD_NAMES[e.id] || e.id, x, y);
        if (i === chk.ci) R.cursor(x - 4, y + 10, chk.focus === 'cmd' ? {} : { still: true, alpha: 0.5 });
      });
      const L = this.checkList(), cur = chk.cells[chk.ci];
      const e = chk.focus === 'list' ? L[chk.li] : null;
      const src = e ? e.src : cur ? chk.info.cmdSrc[cur.id] : null;
      const ix = cw + 4;
      R.window(ix, 178, FF7.W - ix, 122);
      if (src) {
        UI.drawOrb(ix + 22, 198, src, 9);
        R.text((M.def(src) || {}).name || src.id, ix + 38, 189, { size: 16 });
        UI.drawStars(ix + 38, 212, src, { size: 12 });
      }
      if (e && e.ok) {
        R.text('MP needed', ix + 14, 238, { size: 14, color: R.COL.cyan });
        R.text(`${e.mp}/${c.mp}`, FF7.W - 14, 236, { align: 'right', size: 17 });
        if (e.uses != null) { R.text('Uses per battle', ix + 14, 264, { size: 14, color: R.COL.cyan }); R.text(e.uses >= 99 ? '∞' : String(e.uses), FF7.W - 14, 262, { align: 'right', size: 17 }); }
      }
      R.window(0, 304, FF7.W, 176);
      const start = chk.top * 3;
      L.slice(start, start + 15).forEach((it, k) => {
        const i = start + k, x = 36 + (k % 3) * 192, y = 318 + Math.floor(k / 3) * 30;
        R.text(it.name, x, y, { color: it.ok ? R.COL.white : R.COL.gray });
        if (it.all) {   // red arrow: can be cast on All (as in the battle list)
          const nw = R.measure(it.name, 17), g = R.ctx;
          g.save(); g.fillStyle = '#e02020'; g.beginPath(); g.moveTo(x + nw + 8, y + 3); g.lineTo(x + nw + 8, y + 15); g.lineTo(x + nw + 16, y + 9); g.closePath(); g.fill(); g.restore();
        }
        if (chk.focus === 'list' && i === chk.li) R.cursor(x - 4, y + 10);
      });
      if (cur && LIST_CMDS[cur.id] && !L.length) R.text('(none)', 36, 318, { color: R.COL.gray });
      const rows = Math.ceil(L.length / 3);
      if (rows > 5) scrollbar(FF7.W - 26, 314, 156, chk.top, rows, 5);
    }
    // Exchange: every character's slots (3 at a time) and the details of the materia under the cursor
    renderExchange() {
      const ex = this.ex, rows = this.exRows(), row = rows[ex.ri];
      R.window(0, 0, FF7.W, 38); R.text(ex.pick ? 'Choose the slot to exchange with' : 'Choose materia to exchange', 16, 9, { size: 16 });
      R.window(0, 42, 424, 438);
      this.exMembers().slice(ex.top, ex.top + 3).forEach((c, k) => {
        const y = 48 + k * 142;
        const img = R.portrait(c.id); if (img) R.img(img, 14, y + 8, 56, 56);
        R.text(c.name, 84, y + 4);
        [['Wpn.', 'weaponMateria', M.weaponLinks(c)], ['Arm.', 'armorMateria', M.armorLinks(c)]].forEach(([lab, key, links], r) => {
          const sy = y + 50 + r * 46;
          R.text(lab, 84, sy - 9, { size: 14, color: R.COL.cyan });
          UI.drawSlots(150, sy, c[key], links, row && row.c === c && row.key === key ? ex.col : -1);
          if (ex.pick && ex.pick.c === c && ex.pick.key === key) R.cursor(slotX(150, ex.pick.i) - 12, sy, { still: true, alpha: 0.7 });
        });
      });
      const total = this.exMembers().length;
      if (total > 3) scrollbar(404, 52, 418, ex.top, total, 3);
      R.window(428, 42, FF7.W - 428, 438);
      const m = row ? row.c[row.key][ex.col] : null;
      if (!m) return;
      const d = M.def(m);
      UI.drawOrb(448, 64, m, 10); R.text(d ? d.name : m.id, 464, 54, { size: 16 });
      UI.drawStars(446, 82, m, { size: 13 });
      R.text('AP', 446, 108, { size: 14, color: R.COL.cyan }); R.text(M.isMaster(m) ? 'MASTER' : U.fmtNum(m.ap), FF7.W - 14, 106, { align: 'right', size: 16 });
      if (!M.isMaster(m) && d && d.ap && d.ap.length) { R.text('To next level', 446, 132, { size: 14, color: R.COL.cyan }); R.text(U.fmtNum(M.apToNext(m)), FF7.W - 14, 150, { align: 'right', size: 16 }); }
      R.text('Ability List', 446, 178, { size: 14, color: R.COL.cyan });
      UI.materiaAbilities(m).slice(0, 8).forEach((ab, i) => R.text(ab.name, 456, 200 + i * 20, { size: 14, color: ab.ok ? R.COL.white : R.COL.gray }));
      const eff = UI.materiaEffects(m);
      if (eff.length) {
        R.text('Equip effects', 446, 366, { size: 14, color: R.COL.cyan });
        eff.slice(0, 4).forEach((e, i) => { R.text(e.name, 456, 388 + i * 20, { size: 14 }); R.text(e.value, FF7.W - 14, 388 + i * 20, { size: 14, align: 'right' }); });
      }
    }
  }
  UI.MateriaPanel = MateriaPanel;
})();

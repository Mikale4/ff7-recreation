// Runner: the party menu driven like a player (docs/RUNNER.md, "Menus"). The menu ops (equip, materia,
// useItem, heal, row, party, moveMateria, loadout, gear, autoequip, autoMateria, save, the Config trip)
// open the real party menu with the `menu` button (Enter) and work its screens (Item, Materia, Equip,
// Order, Config, PHS, Save) with the virtual buttons: the cursor moves, the character is picked (or
// switched with L1 / R1), the slot and the item or materia are chosen, OK confirms, Cancel backs out to
// the field. A Demo goes at a pace a viewer can follow; a fast run takes the same path, as fast as the
// buttons allow. Every routine checks the screen it expects and returns a reason when something is off;
// the op then notes it and applies the change through the game's systems (the code the screens call).
// opts.menus: 'apply' skips the screens (the old shortcut) in any mode.
(function () {
  const R = FF7.runner, U = FF7.util;
  const MN = R.menus = {};
  const CMDS = ['Item', 'Magic', 'Materia', 'Equip', 'Status', 'Order', 'Limit', 'Config', 'PHS', 'Save', 'Quit'];
  const SLOTS = ['weapon', 'armor', 'accessory'];

  R.menuVisible = function () { const o = R.opts || {}; return o.menus !== 'apply'; };
  // Demo pacing, in frames (a fast run uses none): cursor steps, the pause before OK, a look at the result
  MN.PACE = { open: 6, step: 3, confirm: 4, look: 12, close: 3 };   // frames: an expert player flicking through the menus
  MN.p = (k) => (R.fast ? 0 : Math.round(MN.PACE[k] / ((R.opts && R.opts.menuSpeed) || 1)));

  // ---------------------------------------------------------------- what is open
  MN.main = () => { const t = R.top(); return R.isMainMenu(t) ? t : null; };
  MN.panel = () => { const m = MN.main(); return m && m.panels.length ? m.panels[m.panels.length - 1] : null; };
  MN.kind = function (p) {
    if (!p) return null;
    const UI = FF7.ui, n = p.constructor && p.constructor.name;
    if (UI.EquipPanel && p instanceof UI.EquipPanel) return 'Equip';
    if (UI.MateriaPanel && p instanceof UI.MateriaPanel) return 'Materia';
    if (UI.ItemPanel && p instanceof UI.ItemPanel) return 'Item';
    if (UI.MagicPanel && p instanceof UI.MagicPanel) return 'Magic';
    if (UI.SavePanel && p instanceof UI.SavePanel) return 'Save';
    if (n === 'PhsPanel' || (typeof p.reserve === 'function' && 'side' in p)) return 'PHS';
    if (n === 'OrderPanel' || ('sel' in p && !('side' in p))) return 'Order';
    if (n === 'ConfigPanel' || (typeof p.items === 'function' && !('c' in p))) return 'Config';
    if (n === 'LimitPanel' || (typeof p.levels === 'function' && 'c' in p && 'idx' in p)) return 'Limit';
    return n || 'panel';
  };

  // ---------------------------------------------------------------- buttons
  MN.wait = function* (n) { for (let i = 0; i < n; i++) yield; };
  // a press (the button needs a frame up first), then `after` frames
  MN.tap = function* (b, after) { for (let g = 0; g < 8 && !R.tap(b); g++) yield; yield; yield* MN.wait(after || 0); };
  // move a cursor (get() -> index) to `want` with prev / next; wrap: the list wraps around. Single presses;
  // in a Demo a very long way is held down (the cursor auto-repeats) until the last steps.
  MN.seek = function* (get, want, n, prev, next, wrap) {
    for (let g = 0; g < 800; g++) {
      if (!R.active) return false;
      const cur = get(); if (cur == null) return false;
      if (cur === want) return true;
      let d = want - cur; if (wrap && n > 0) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
      const b = d > 0 ? next : prev;
      if (!R.fast && Math.abs(d) > 12) { R.hold(b, 1); yield; continue; }   // (the auto-repeat only beats presses on long ways)
      yield* MN.tap(b, MN.p('step'));
    }
    return false;
  };

  // ---------------------------------------------------------------- open / close
  // The menu opens from the field or the world map when the player could open it (free, menu enabled).
  MN.canOpen = function () {
    if (MN.main()) return true;
    const fs = R.field(), ws = R.worldScene();
    if (fs) return FF7.state.menuEnabled !== false && R.fieldFree(fs) && !R.topModal();
    if (ws) return !(ws.busy || ws.transitioning) && !R.topModal();
    return false;
  };
  MN.open = function* () {
    for (let g = 0; g < 900; g++) {
      if (!R.active) return 'stopped';
      if (MN.main()) { R.menuOwn = true; if (g) yield* MN.wait(MN.p('open')); return true; }
      const fs = R.field(), ws = R.worldScene();
      if (!fs && !ws) return 'the menu only opens on a field map or the world map';
      if (fs && FF7.state.menuEnabled === false) return 'the menu is disabled on ' + fs.map.id;
      if (!MN.canOpen() || FF7.sceneMgr.transition) { yield; continue; }
      R.menuOwn = true;                                // the event handler leaves this menu alone
      yield* MN.tap('menu', 1);
    }
    return 'the menu did not open';
  };
  // Cancel backs out of every screen (never Triangle: on the Materia screen it takes materia off)
  MN.close = function* () {
    for (let g = 0; g < 40 && MN.main(); g++) {
      const p = MN.panel();
      if (p && p.msg) { yield* MN.tap('ok', MN.p('step')); continue; }
      yield* MN.tap('cancel', MN.p('close'));
    }
    R.menuOwn = false;
    return !MN.main();
  };
  // back to the command list
  MN.root = function* () {
    for (let g = 0; g < 30; g++) {
      const m = MN.main(); if (!m) return 'the menu closed';
      if (!m.panels.length && !m.charSel) return true;
      const p = MN.panel();
      if (p && p.msg) { yield* MN.tap('ok', MN.p('step')); continue; }
      yield* MN.tap('cancel', MN.p('step'));
    }
    return 'could not get back to the command list';
  };
  // a screen's base state (its sub-lists and questions closed)
  MN.base = function* (p) {
    for (let g = 0; g < 14; g++) {
      if (MN.panel() !== p) return false;
      const k = MN.kind(p);
      if (p.msg) { yield* MN.tap('ok', MN.p('step')); continue; }
      if (k === 'Equip') { if (p.mode === 'slot') return true; }
      else if (k === 'Materia') { if (p.mode === 'slots') return true; if (p.mode === 'cmd') { yield* MN.tap('left', MN.p('step')); continue; } }
      else if (k === 'Item' || k === 'Magic') { if (p.mode === 'list') return true; }
      else if (k === 'Order') { if (p.sel < 0) return true; }
      else if (k === 'PHS') { if (!p.pick) return true; }
      else if (k === 'Save') { if (!p.confirm) return true; }
      else return true;
      yield* MN.tap('cancel', MN.p('step'));
    }
    return false;
  };

  // A command of the menu (and the character, for the screens that ask): Equip, Materia, Item, Order...
  MN.command = function* (name, ch) {
    let r = yield* MN.open(); if (r !== true) return r;
    r = yield* MN.root(); if (r !== true) return r;
    const m = MN.main(), want = CMDS.indexOf(name);
    if (!m.enabled(name)) return name + ' is not available here';
    if (!(yield* MN.seek(() => MN.main() && !MN.main().panels.length ? MN.main().cursor : null, want, CMDS.length, 'up', 'down', true))) return 'the cursor did not reach ' + name;
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (m.charSel) {
      const party = m.party(), idx = party.findIndex(c => c.id === ch);
      if (idx < 0) { yield* MN.tap('cancel'); return (ch || '?') + ' is not in the active party'; }
      if (!(yield* MN.seek(() => m.charSel ? m.charSel.idx : null, idx, party.length, 'up', 'down', true))) return 'the character cursor got lost';
      yield* MN.wait(MN.p('confirm'));
      yield* MN.tap('ok', MN.p('open'));
    }
    return MN.kind(MN.panel()) === name ? true : 'the ' + name + ' screen did not open';
  };
  // make sure a screen is open (for that character): stays on it when it is, switches the character
  // with L1 / R1 when only the character differs, else goes through the command list
  MN.screen = function* (name, ch) {
    const p = MN.panel();
    if (p && MN.kind(p) === name) {
      if (!ch || !p.c || p.c.id === ch) return (yield* MN.base(p)) ? true : 'the ' + name + ' screen is in an unexpected state';
      const party = MN.main().party(), idx = party.findIndex(c => c.id === ch);
      if (idx >= 0 && (name === 'Equip' || name === 'Materia') && (yield* MN.base(p))) {   // (on the Magic screen L1 / R1 turn the page)
        yield* MN.seek(() => { const q = MN.panel(); return q === p && q.c ? party.indexOf(q.c) : null; }, idx, party.length, 'l1', 'r1', true);
        yield* MN.wait(MN.p('step'));
        if (MN.panel() === p && p.c && p.c.id === ch) return true;
      }
    }
    return yield* MN.command(name, ch);
  };

  // Run a menu routine for an op: true when done() holds afterwards. A routine that could not finish is
  // noted (the op then applies the change directly). o.keep: leave the menu open (more changes follow).
  MN.run = function* (what, gen, done, o = {}) {
    let r;
    try { r = yield* gen; } catch (e) { r = 'error: ' + e.message; }
    if (!o.keep || r !== true) yield* MN.close();
    if (done()) return true;
    if (o.accept && typeof r === 'string' && o.accept.test(r)) return r;     // a real answer (the item has no effect)
    R.note('menu: ' + what + ': ' + r + ' (applied directly)');
    return false;
  };
  // A batch of menu changes that keeps the menu open between them: close it afterwards
  MN.finish = function* () { if (MN.main() && R.menuOwn) yield* MN.close(); R.menuOwn = false; };

  // ---------------------------------------------------------------- Equip
  MN.equip = function* (ch, slot, id) {
    const c = FF7.state.chars[ch];
    let r = yield* MN.screen('Equip', ch); if (r !== true) return r;
    const p = MN.panel();
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'slot' ? p.slot : null, SLOTS.indexOf(slot), 3, 'up', 'down', true))) return 'the slot cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    if (!id) {
      if (slot !== 'accessory') return 'only an accessory can be taken off';
      if (c.accessory) yield* MN.tap('menu', MN.p('look'));        // Triangle takes the accessory off
      return c.accessory ? 'the accessory stayed on' : true;
    }
    yield* MN.tap('ok', MN.p('step'));
    if (MN.panel() !== p || p.mode !== 'list') return 'the ' + slot + ' list did not open';
    const L = p.options(), want = L.findIndex(e => e.id === id);
    if (want < 0) { yield* MN.tap('cancel'); return U.itemName(id) + ' is not in the list'; }
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'list' ? p.idx : null, want, L.length, 'up', 'down', true))) return 'the list cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    return c[slot] === id ? true : 'the equip did not take';
  };

  // ---------------------------------------------------------------- Materia
  const rowOf = (key) => (key === 'armorMateria' || key === 'armor' || key === 1 ? 1 : 0);
  // the slot cursor to (row, col): Down from the weapon row reaches the armour row, Up comes back
  MN.slot = function* (p, row, col) {
    for (let g = 0; g < 6 && MN.panel() === p && p.mode === 'slots' && p.row !== row; g++) yield* MN.tap(row === 1 ? 'down' : 'up', MN.p('step'));
    if (MN.panel() !== p || p.mode !== 'slots' || p.row !== row) return 'the slot cursor got lost';
    const n = p.arr(row).length;
    if (col >= n) return 'there is no slot ' + (col + 1);
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'slots' ? p.col : null, col, n, 'left', 'right', false))) return 'the slot cursor got lost';
    return true;
  };
  // the materia at list index `si` into a slot (the slot's own materia goes back to the list there)
  MN.materiaPut = function* (ch, key, col, si) {
    const row = rowOf(key);
    let r = yield* MN.screen('Materia', ch); if (r !== true) return r;
    const p = MN.panel(), S = FF7.state.materia, inst = S[si];
    if (!inst) return 'no materia at list position ' + si;
    r = yield* MN.slot(p, row, col); if (r !== true) return r;
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (MN.panel() !== p || p.mode !== 'stock') return 'the materia list did not open';
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'stock' ? p.idx : null, S.indexOf(inst), S.length, 'up', 'down', true))) return 'the list cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    return p.arr(row)[col] === inst ? true : 'the materia did not go in';
  };
  // take a slot's materia off (Triangle)
  MN.materiaTake = function* (ch, key, col) {
    const row = rowOf(key);
    let r = yield* MN.screen('Materia', ch); if (r !== true) return r;
    const p = MN.panel();
    r = yield* MN.slot(p, row, col); if (r !== true) return r;
    if (!p.arr(row)[col]) return true;
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('menu', MN.p('look'));
    return p.arr(row)[col] ? 'the materia stayed on' : true;
  };
  // Arrange > Exchange: swap two slots { c: charId, key: 'weaponMateria' | 'armorMateria', i } of any
  // characters (the reserve too)
  MN.materiaExchange = function* (a, b) {
    const cur = MN.panel(), lead = FF7.sys.party.active()[0];
    let r = yield* MN.screen('Materia', cur && MN.kind(cur) === 'Materia' ? cur.c.id : (FF7.sys.party.active().some(c => c.id === a.c) ? a.c : lead && lead.id)); if (r !== true) return r;
    const p = MN.panel();
    r = yield* MN.slot(p, 0, 0); if (r !== true && !/no slot/.test(r)) return r;
    if (p.row !== 0) return 'the slot cursor got lost';
    yield* MN.tap('up', MN.p('step'));                              // up from the weapon row: Arrange
    if (p.mode !== 'cmd') return 'the Check / Arrange box did not take the cursor';
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'cmd' ? p.cmd : null, 1, 2, 'up', 'down', false))) return 'the cursor did not reach Arrange';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (p.mode !== 'arrange') return 'the Arrange list did not open';
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'arrange' ? p.arrIdx : null, 1, 4, 'up', 'down', true))) return 'the cursor did not reach Exchange';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (p.mode !== 'exchange') return 'the Exchange screen did not open';
    const A = FF7.state.chars[a.c][a.key], B = FF7.state.chars[b.c][b.key], ma = A[a.i], mb = B[b.i];
    for (const end of [a, b]) {
      const rows = p.exRows(), ri = rows.findIndex(x => x.c.id === end.c && x.key === end.key);
      if (ri < 0) return end.c + ' has no ' + (end.key === 'weaponMateria' ? 'weapon' : 'armour') + ' slots on the Exchange screen';
      if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'exchange' ? p.ex.ri : null, ri, rows.length, 'up', 'down', true))) return 'the Exchange cursor got lost';
      if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'exchange' ? p.ex.col : null, end.i, rows[ri].c[end.key].length, 'left', 'right', false))) return 'the Exchange cursor got lost';
      yield* MN.wait(MN.p('confirm'));
      yield* MN.tap('ok', end === b ? MN.p('look') : MN.p('step'));
    }
    const ok = A[a.i] === mb && B[b.i] === ma;
    yield* MN.base(p);                                               // back out to the slots
    return ok ? true : 'the exchange did not take';
  };

  // ---------------------------------------------------------------- Item
  MN.useItem = function* (id, ch) {
    let r = yield* MN.screen('Item'); if (r !== true) return r;
    const p = MN.panel();
    if (p.keys) yield* MN.tap('square', MN.p('step'));              // the items, not the key items
    const L = FF7.state.items, want = L.findIndex(e => e.id === id);
    if (want < 0) return 'no ' + U.itemName(id) + ' in the bag';
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'list' && !p.keys ? p.idx : null, want, L.length, 'up', 'down', true))) return 'the item cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (p.mode !== 'target') return U.itemName(id) + ' cannot be used here';
    const party = MN.main().party(), ti = party.findIndex(c => c.id === ch);
    if (ti < 0) { yield* MN.tap('cancel'); return ch + ' is not in the active party'; }
    if (!p.all && !(yield* MN.seek(() => MN.panel() === p && p.mode === 'target' ? p.tIdx : null, ti, party.length, 'up', 'down', true))) return 'the target cursor got lost';
    const before = FF7.sys.inv.count(id);
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    const msg = p.msg;
    if (msg) yield* MN.tap('ok', MN.p('step'));
    return FF7.sys.inv.count(id) < before ? true : 'no effect' + (msg ? ' (' + msg + ')' : '');
  };

  // ---------------------------------------------------------------- Magic (a healing spell in the field)
  // caster ch casts spell id on targetId, or on everyone ('all': an All-linked spell, or an All spell)
  MN.cast = function* (ch, id, target) {
    const st = FF7.state, c = st.chars[ch];
    let r = yield* MN.screen('Magic', ch); if (r !== true) return r;
    const p = MN.panel();
    for (let g = 0; g < 3 && p.tab !== 0; g++) yield* MN.tap('r1', MN.p('step'));    // the Magic page
    const L = p.lists()[0], want = L.findIndex(sp => sp.id === id);
    if (want < 0) return ch + ' has no ' + id;
    if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'list' && p.tab === 0 ? p.idx : null, want, L.length, 'left', 'right', true))) return 'the spell cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));
    if (p.mode !== 'target') return id + ' cannot be cast now';
    if (target === 'all') { if (!p.useAll && p.allToggle) yield* MN.tap('r1', MN.p('step')); if (!p.useAll) return id + ' cannot be cast on everyone'; }
    else {
      if (p.useAll && p.allToggle) yield* MN.tap('r1', MN.p('step'));
      const party = MN.main().party(), ti = party.findIndex(x => x.id === target);
      if (ti < 0) return target + ' is not in the active party';
      if (!(yield* MN.seek(() => MN.panel() === p && p.mode === 'target' ? p.tIdx : null, ti, party.length, 'up', 'down', true))) return 'the target cursor got lost';
    }
    const mp0 = c.mp;
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    yield* MN.base(p);
    return c.mp < mp0 ? true : 'no effect';
  };

  // ---------------------------------------------------------------- Order (row)
  MN.row = function* (ch, row) {
    const c = FF7.state.chars[ch];
    let r = yield* MN.screen('Order'); if (r !== true) return r;
    const p = MN.panel(), party = FF7.state.party.filter(Boolean), idx = party.indexOf(ch);
    if (idx < 0) return ch + ' is not in the active party';
    if (c.row === row) return true;
    if (!(yield* MN.seek(() => MN.panel() === p ? p.idx : null, idx, party.length, 'up', 'down', true))) return 'the cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('step'));                              // choose them...
    yield* MN.tap('ok', MN.p('look'));                              // ...twice: the row changes
    return c.row === row ? true : 'the row did not change';
  };

  // ---------------------------------------------------------------- Limit (the limit level)
  // Menu > Limit > the character > the level (Up / Down) > OK: FF7 sets it (the gauge empties) when a limit
  // of that level is known
  MN.limitLevel = function* (ch, n) {
    const c = FF7.state.chars[ch];
    let r = yield* MN.screen('Limit', ch); if (r !== true) return r;
    const p = MN.panel();
    if (!(yield* MN.seek(() => MN.panel() === p ? p.idx : null, n - 1, 4, 'up', 'down', false))) return 'the level cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    yield* MN.tap('ok', MN.p('look'));
    return c.limitLevel === n ? true : 'level ' + n + ' was not set (no limit of that level known)';
  };

  // ---------------------------------------------------------------- PHS (party)
  // Swaps until the party is `ids` in that order. A member who can't leave (FF7.state.locked, Cloud)
  // can't be picked first, but can be the second pick of a swap inside the party.
  MN.party = function* (ids) {
    const st = FF7.state;
    if (ids.length !== st.party.filter(Boolean).length) return 'the PHS swaps members; it cannot change the party size';
    let r = yield* MN.screen('PHS'); if (r !== true) return r;
    const p = MN.panel(), locked = (id) => !!id && (st.locked || []).includes(id);
    const pick = function* (side, idx) {
      if (p.side !== side) yield* MN.tap(side ? 'right' : 'left', MN.p('step'));
      const n = side ? Math.max(1, p.reserve().length) : 3;
      if (!(yield* MN.seek(() => MN.panel() === p && p.side === side ? p.idx : null, idx, n, 'up', 'down', true))) return false;
      yield* MN.wait(MN.p('confirm'));
      yield* MN.tap('ok', MN.p('step'));
      return true;
    };
    for (let g = 0; g < 8; g++) {
      const i = ids.findIndex((id, k) => st.party[k] !== id);
      if (i < 0) { yield* MN.wait(MN.p('look')); return true; }
      const cur = st.party[i], want = ids[i], j = st.party.indexOf(want);
      let a, b;
      if (j >= 0) [a, b] = locked(cur) ? [[0, j], [0, i]] : [[0, i], [0, j]];          // a swap inside the party
      else if (locked(cur)) { const k = ids.indexOf(cur); if (k < 0 || k === i) return cur + ' cannot leave the party'; [a, b] = [[0, k], [0, i]]; }
      else { const ri = p.reserve().indexOf(want); if (ri < 0) return want + ' is not in the reserve'; [a, b] = [[0, i], [1, ri]]; }
      if (!(yield* pick(a[0], a[1])) || !p.pick) { yield* MN.base(p); return 'the PHS did not take the pick'; }
      if (!(yield* pick(b[0], b[1]))) return 'the PHS cursor got lost';
      if (p.pick) { yield* MN.base(p); return 'the swap did not take'; }
    }
    return 'the party did not come out right';
  };

  // ---------------------------------------------------------------- Config (Run: Always)
  MN.configRun = function* (on) {
    let r = yield* MN.screen('Config'); if (r !== true) return r;
    const p = MN.panel(), c = FF7.state.config;
    // (the options are in tabs: R1 / L1 to Run's, then down from the tab bar, row -1)
    const tab = p.tabOf ? p.tabOf('Run') : 0;
    if (tab < 0) return 'no Run setting';
    if (p.tabOf && !(yield* MN.seek(() => MN.panel() === p ? p.tab : null, tab, p.tabs().length, 'l1', 'r1', true))) return 'the Config tabs got lost';
    const idx = p.items().findIndex(it => it[0] === 'Run');
    if (idx < 0) return 'no Run setting';
    if (!(yield* MN.seek(() => MN.panel() === p ? p.idx + 1 : null, idx + 1, p.items().length + 1, 'up', 'down', true))) return 'the Config cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    if (!!c.alwaysRun !== !!on) yield* MN.tap('ok', MN.p('look'));
    return !!c.alwaysRun === !!on ? true : 'the setting did not change';
  };

  // ---------------------------------------------------------------- Save (the DEMO file row)
  MN.save = function* () {
    let r = yield* MN.screen('Save'); if (r !== true) return r;
    const p = MN.panel();
    if (p.demoRow == null) return 'the Save screen has no Demo file row';
    if (!(yield* MN.seek(() => MN.panel() === p && !p.msg ? p.idx : null, p.demoRow, p.rows, 'up', 'down', true))) return 'the file cursor got lost';
    yield* MN.wait(MN.p('confirm'));
    const n0 = R._menuSaves || 0;
    yield* MN.tap('ok', MN.p('look'));
    if (MN.panel() === p && p.confirm) yield* MN.tap('ok', MN.p('look'));      // overwrite? yes
    if (MN.panel() === p && p.msg) yield* MN.tap('ok', MN.p('step'));
    return (R._menuSaves || 0) > n0 ? true : 'the save did not go through';
  };
  // a save prompt the story opens (the modal Save screen): the DEMO row, OK
  MN.savePrompt = function (w) {
    const p = w.panel;
    if (p.msg) { R.tap('ok'); return; }
    if (p.confirm) { R.tap('ok'); return; }
    if (w._rSaved || p.demoRow == null) { R.tap('cancel'); return; }
    w._rT = (w._rT || 0) + 1;
    if (!R.fast && w._rT < MN.PACE.open) return;
    if (p.idx !== p.demoRow) { if (R.fast || w._rT % Math.max(2, MN.PACE.step) === 0) { const d = ((p.demoRow - p.idx) % p.rows + p.rows) % p.rows; R.tap(d <= p.rows / 2 ? 'down' : 'up'); } return; }
    if (!R.fast && w._rT % MN.PACE.confirm !== 0) return;
    if (R.tap('ok')) w._rSaved = true;
  };
})();

// Item menu and Magic menu (field use).
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui, D = FF7.data;

  // Apply a consumable item outside battle. Returns { ok, msg }.
  FF7.sys.useItemField = function (id, c, all) {
    const def = D.items[id]; if (!def) return { ok: false };
    const e = def.effect || {};
    const targets = all ? FF7.sys.party.active() : [c];
    let ok = false;
    if (e.tent) { if (!FF7.saveNearby && FF7.state.loc.mode !== 'world') return { ok: false, msg: 'Can only be used at a save point.' }; FF7.sys.party.healAll(false); return { ok: true, heal: true }; }
    if (e.learnLimit) {
      const L = D.limits[e.learnLimit];
      if (!L || L.char !== c.id) return { ok: false, msg: 'Nothing happens.' };
      const others = Object.keys(D.limits).filter(k => D.limits[k].char === c.id && k !== e.learnLimit);
      if (!others.every(k => c.limitsKnown.includes(k))) return { ok: false, msg: `${c.name} isn't ready to learn it yet.` };
      if (!c.limitsKnown.includes(e.learnLimit)) c.limitsKnown.push(e.learnLimit);
      return { ok: true, msg: `${c.name} learned "${L.name}"!` };
    }
    for (const t of targets) {
      if (e.revive && t.hp <= 0) { t.hp = Math.max(1, Math.floor(t.maxHp * e.revive / 100)); ok = true; continue; }
      if (t.hp <= 0) continue;
      if (e.healHp && t.hp < t.maxHp) { t.hp = Math.min(t.maxHp, t.hp + e.healHp); ok = true; }
      if (e.healHpPct && t.hp < t.maxHp) { t.hp = Math.min(t.maxHp, t.hp + Math.floor(t.maxHp * e.healHpPct / 100)); ok = true; }
      if (e.healMp && t.mp < t.maxMp) { t.mp = Math.min(t.maxMp, t.mp + e.healMp); ok = true; }
      if (e.healMpPct && t.mp < t.maxMp) { t.mp = Math.min(t.maxMp, t.mp + Math.floor(t.maxMp * e.healMpPct / 100)); ok = true; }
      if (e.cure) e.cure.forEach(s => { if (t.status && t.status[s]) { delete t.status[s]; ok = true; } });
      if (e.statUp) { for (const k in e.statUp) { t.bonus[k] = Math.min(255 - t.stats[k], (t.bonus[k] || 0) + e.statUp[k]); } FF7.sys.stats.recalc(t); ok = true; }
    }
    return { ok, heal: ok };
  };

  // ---------------------------------------------------------------- Item panel
  class ItemPanel extends UI.Panel {
    constructor(m) { super(m); this.idx = 0; this.top = 0; this.mode = 'list'; this.tIdx = 0; this.keys = false; this.msg = null; }
    list() { return this.keys ? FF7.state.keyItems.map(id => ({ id, qty: 1, key: true })) : FF7.state.items; }
    update() {
      if (this.msg) { if (I.pressed('ok') || I.back()) this.msg = null; return; }
      if (this.mode === 'target') return this.updateTarget();
      const L = this.list();
      if (I.pressed('l1') || I.pressed('r1') || I.pressed('square')) { this.keys = !this.keys; this.idx = 0; this.top = 0; FF7.audio.sfx('cursor'); return; }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (!L.length) return;
      if (I.repeat('up')) { this.idx = (this.idx + L.length - 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % L.length; FF7.audio.sfx('cursor'); }
      if (this.idx < this.top) this.top = this.idx; if (this.idx >= this.top + 10) this.top = this.idx - 9;
      // a key item with a use of its own (D.keyItems[id].use: a script, e.g. the MogBoy): the menu closes and it runs
      // where the party stands (the field or the world map)
      if (I.pressed('ok') && this.keys) {
        const kd = D.keyItems[(L[this.idx] || {}).id];
        if (!kd || typeof kd.use !== 'function') { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        FF7.sceneMgr.pop();
        const sc = FF7.sceneMgr.top();
        if (sc && sc.runScript) sc.runScript(kd.use, { name: 'key item ' + L[this.idx].id });
        return;
      }
      if (I.pressed('ok') && !this.keys) {
        const it = L[this.idx]; const def = D.items[it.id];
        if (!def || !def.field) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        this.mode = 'target'; this.tIdx = 0; this.all = /allAllies/.test(def.target || '');
      }
    }
    updateTarget() {
      const party = this.menu.party();
      if (I.repeat('up')) { this.tIdx = (this.tIdx + party.length - 1) % party.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.tIdx = (this.tIdx + 1) % party.length; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.mode = 'list'; return; }
      if (I.pressed('ok')) {
        const it = FF7.state.items[this.idx];
        if (!it) { this.mode = 'list'; return; }
        const r = FF7.sys.useItemField(it.id, party[this.tIdx], this.all);
        if (r.ok) { FF7.audio.sfx(r.heal ? 'heal' : 'use'); FF7.sys.inv.remove(it.id, 1); if (!FF7.state.items[this.idx]) { this.idx = Math.max(0, this.idx - 1); this.mode = 'list'; } }
        else FF7.audio.sfx('error');
        if (r.msg) this.msg = r.msg;
      }
    }
    render() {
      R.window(0, 0, FF7.W, 40);
      R.text(this.keys ? 'Key Items' : 'Item', 20, 10, { color: R.COL.cyan });
      R.text(FF7.input.label('l1') + '/' + FF7.input.label('r1') + ': items / key items', 620, 12, { align: 'right', size: 13, color: R.COL.gray });   // (the player's own keys)
      const L = this.list();
      const cur = L[this.idx];
      const desc = cur ? (cur.key ? (D.keyItems[cur.id] || {}).desc : (U.findItem(cur.id) || { def: {} }).def.desc) : '';
      R.window(0, 44, FF7.W, 38); R.textFit(desc || '', 20, 53, FF7.W - 40, { size: 16, minSize: 13 });   // (kept inside the bar)
      // party column
      R.window(0, 86, 280, 394);
      this.menu.party().forEach((c, i) => { UI.drawCharBlock(c, 12, 100 + i * 124, { small: true }); if (this.mode === 'target' && (this.all || i === this.tIdx)) R.cursor(8, 130 + i * 124); });
      // list
      R.window(280, 86, 360, 394);
      L.slice(this.top, this.top + 10).forEach((it, k) => {
        const i = this.top + k;
        const y = 100 + k * 36;
        const def = !it.key && D.items[it.id];
        if (!it.key) UI.itemIcon(R.ctx, 316, y + 1, UI.iconKind(it.id));    // FF7: bottle / weapon / armlet / ring glyph (key items have none)
        R.text(U.itemName(it.id), it.key ? 316 : 336, y, { color: it.key ? R.COL.white : (def && def.field ? R.COL.white : R.COL.gray) });
        if (!it.key) R.text(':' + U.pad(it.qty, 3), 624, y, { align: 'right' });
        if (i === this.idx && this.mode === 'list') R.cursor(310, y + 10);
      });
      if (!L.length) R.text('(none)', 316, 100, { color: R.COL.gray });
      if (this.msg) { R.window(120, 200, 400, 60); R.text(this.msg, 320, 220, { align: 'center', size: 16 }); }
    }
  }
  UI.ItemPanel = ItemPanel;

  // ---------------------------------------------------------------- Magic panel
  class MagicPanel extends UI.Panel {
    constructor(m, c) { super(m); this.c = c; this.idx = 0; this.mode = 'list'; this.tIdx = 0; this.tab = 0; }
    spells() { return FF7.sys.materia.abilities(this.c).spells.map(s => Object.assign({ def: D.spells[s.id] }, s)).filter(s => s.def); }
    lists() { const ab = FF7.sys.materia.abilities(this.c); return [this.spells(), ab.summons.map(s => ({ id: s.id, def: D.summons[s.id] })).filter(s => s.def), ab.eskills.map(id => ({ id, def: D.eskills[id] })).filter(s => s.def)]; }
    update() {
      const lists = this.lists();
      const L = lists[this.tab];
      if (this.mode === 'target') return this.updateTarget(L);
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('l1') || I.pressed('r1')) { this.tab = (this.tab + 1) % 3; this.idx = 0; FF7.audio.sfx('cursor'); return; }
      if (!L.length) return;
      if (I.repeat('up')) { this.idx = (this.idx + L.length - 3) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 3) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('left')) { this.idx = (this.idx + L.length - 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { this.idx = (this.idx + 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.pressed('ok')) {
        const s = L[this.idx];
        if (this.tab !== 0 || !['heal', 'revive', 'cure', 'fullcure'].includes(s.def.kind) || this.c.mp < s.def.mp || this.c.hp <= 0) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm'); this.mode = 'target'; this.tIdx = 0;
        this.all = s.def.target === 'allAllies' || (s.supports || []).some(x => x.id === 'all');
        this.allToggle = this.all && s.def.target !== 'allAllies';
        this.useAll = s.def.target === 'allAllies';
      }
    }
    updateTarget(L) {
      const party = this.menu.party();
      if (I.repeat('up')) { this.tIdx = (this.tIdx + party.length - 1) % party.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.tIdx = (this.tIdx + 1) % party.length; FF7.audio.sfx('cursor'); }
      if (this.allToggle && (I.pressed('r1') || I.pressed('square'))) { this.useAll = !this.useAll; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.mode = 'list'; return; }
      if (I.pressed('ok')) {
        const s = L[this.idx]; const d = s.def;
        if (this.c.mp < d.mp) { FF7.audio.sfx('error'); return; }
        const ts = this.useAll ? party : [party[this.tIdx]];
        let did = false;
        for (const t of ts) {
          if (d.kind === 'revive') { if (t.hp <= 0) { t.hp = Math.max(1, Math.floor(t.maxHp * (d.pct || 25) / 100)); did = true; } continue; }
          if (t.hp <= 0) continue;
          if (d.kind === 'heal') { let h = 6 * (this.c.d.mag + this.c.level) + 22 * (d.power || 0); if (ts.length > 1) h = Math.floor(h * 2 / 3); if (t.hp < t.maxHp) { t.hp = Math.min(t.maxHp, t.hp + h); did = true; } }
          if (d.kind === 'fullcure') { if (t.hp < t.maxHp) { t.hp = t.maxHp; did = true; } }
          if (d.kind === 'cure' && d.remove) d.remove.forEach(st => { if (t.status && t.status[st]) { delete t.status[st]; did = true; } });
        }
        if (did) { this.c.mp -= d.mp; FF7.audio.sfx('heal'); } else FF7.audio.sfx('error');
      }
    }
    render() {
      const lists = this.lists();
      const L = lists[this.tab];
      R.window(0, 0, FF7.W, 120);
      UI.drawCharBlock(this.c, 14, 14, { small: true });
      R.text(['Magic', 'Summon', 'Enemy-Skill'][this.tab], 420, 16, { color: R.COL.cyan }); R.text(FF7.input.label('l1') + '/' + FF7.input.label('r1') + ': switch', 620, 18, { align: 'right', size: 12, color: R.COL.gray });
      const s = L[this.idx];
      R.window(0, 124, FF7.W, 38); R.text(s && s.def ? (s.def.desc || '') : '', 20, 133, { size: 16 });
      R.window(0, 166, FF7.W, 314);
      L.forEach((it, i) => {
        const x = 40 + (i % 3) * 200, y = 180 + Math.floor(i / 3) * 34;
        if (y > 450) return;
        R.text(it.def.name, x, y, { color: this.tab === 0 && ['heal', 'revive', 'cure', 'fullcure'].includes(it.def.kind) ? R.COL.white : R.COL.gray });
        if (i === this.idx) R.cursor(x - 6, y + 10);
      });
      if (s && s.def) { R.window(460, 60, 170, 58); R.text('MP needed', 472, 66, { size: 13, color: R.COL.cyan }); R.text(`${s.def.mp || 0}/${this.c.mp}`, 620, 86, { align: 'right' }); }
      if (this.mode === 'target') {
        R.window(160, 150, 320, 330);
        this.menu.party().forEach((c, i) => { UI.drawCharBlock(c, 180, 166 + i * 104, { small: true }); if (this.useAll || i === this.tIdx) R.cursor(176, 196 + i * 104); });
      }
    }
  }
  UI.MagicPanel = MagicPanel;
})();

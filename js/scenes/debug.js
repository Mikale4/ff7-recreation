// Debug menu (index.html?debug, F2 anywhere): warp to any field map / world location, battle test,
// movies, minigames, party levels, items, flags. Development aid only.
(function () {
  const R = FF7.render, I = FF7.input, U = FF7.util, D = FF7.data;

  function chapterOf(file) { const m = /maps\/([^/]+)\//.exec(file || ''); return m ? m[1] : 'other'; }

  class DebugMenu {
    constructor() {
      this.modal = true; this.done = false; this.aboveFade = true;
      this.page = 'main'; this.idx = 0; this.top = 0; this.msg = '';
      this.mapIds = Object.keys(FF7.maps).sort();
    }
    list() {
      const st = FF7.state;
      if (this.page === 'main') return [
        ['Warp to field map…', () => this.go('maps')],
        ['World map at location…', () => this.go('world')],
        ['Battle test (enemy)…', () => this.go('enemies')],
        ['Encounter table test…', () => this.go('tables')],
        ['Play movie…', () => this.go('movies')],
        ['Play minigame…', () => this.go('games')],
        ['Party: all members, level +10', () => { ['barret', 'tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'reno', 'rude', 'elena'].forEach(id => { if (!st.members.includes(id)) FF7.sys.party.join(id); }); st.members.forEach(id => { const c = st.chars[id]; if (c) FF7.sys.stats.autoLevel ? FF7.sys.stats.autoLevel(c, Math.min(99, c.level + 10)) : 0; }); FF7.sys.party.healAll(); this.msg = 'Party levelled.'; }],
        ['Give 99 of every item + 50000 gil', () => { Object.keys(D.items).forEach(id => FF7.sys.inv.add(id, 99)); FF7.sys.inv.addGil(50000); this.msg = 'Items given.'; }],
        ['Give one of every materia (mastered)', () => { Object.keys(D.materia).forEach(id => { const m = FF7.sys.materia.make(id, 9999999); FF7.sys.materia.toStock(m); }); this.msg = 'Materia given.'; }],
        ['Heal party', () => { FF7.sys.party.healAll(); this.msg = 'Healed.'; }],
        [`Encounters: ${st.config.encounters || 'normal'}`, () => { st.config.encounters = st.config.encounters === 'off' ? 'normal' : 'off'; }],
        ['Enable PHS + menu', () => { st.phsEnabled = true; st.menuEnabled = true; this.msg = 'PHS on.'; }],
        ['Close', () => { this.done = true; }],
      ];
      if (this.page === 'maps') return this.mapIds.map(id => [`${id}  (${FF7.maps[id].name || ''})`, () => { this.done = true; FF7.sceneMgr.layer.forEach(w => { if (w !== this && w.modal) w.done = true; }); FF7.field.start(id); }]);
      if (this.page === 'world') return D.world.locations.map(L => [L.id + ' — ' + L.name, () => { this.done = true; FF7.world.enter(L.id); }]);
      if (this.page === 'enemies') return Object.keys(D.enemies).sort().map(id => [id + ' — ' + (D.enemies[id].name || ''), () => { this.done = true; FF7.battle.start({ enemies: [id], bg: 'grass' }); }]);
      if (this.page === 'tables') return Object.keys(D.encounters).sort().map(id => [id, () => { this.done = true; const t = D.encounters[id]; if (t && t.length) FF7.battle.start({ formation: U.weighted(t, 'w') || t[0], bg: 'grass' }); }]);
      if (this.page === 'movies') return ((FF7.cinema && FF7.cinema.list) || []).map(m => [typeof m === 'string' ? m : m.id, () => { this.done = true; FF7.cinema.play(typeof m === 'string' ? m : m.id, {}); }]);
      if (this.page === 'games') return ((FF7.minigames && FF7.minigames.list) || []).map(g => [typeof g === 'string' ? g : (g.id + ' — ' + (g.title || '')), () => { this.done = true; FF7.minigames.start(typeof g === 'string' ? g : g.id, {}); }]);
      return [];
    }
    go(p) { this.page = p; this.idx = 0; this.top = 0; }
    update(focus) {
      if (!focus) return;
      const L = this.list(), n = L.length;
      if (I.back() || I.pressed('debug')) { if (this.page === 'main') this.done = true; else this.go('main'); return; }
      if (!n) return;
      const step = I.held('run') ? 10 : 1;
      if (I.repeat('up')) this.idx = (this.idx - step + n * 10) % n;
      if (I.repeat('down')) this.idx = (this.idx + step) % n;
      if (I.repeat('left')) this.idx = Math.max(0, this.idx - 12);
      if (I.repeat('right')) this.idx = Math.min(n - 1, this.idx + 12);
      if (this.idx < this.top) this.top = this.idx; if (this.idx >= this.top + 12) this.top = this.idx - 11;
      if (I.pressed('ok')) { FF7.audio.sfx('confirm'); try { L[this.idx][1](); } catch (e) { console.error(e); this.msg = 'Error: ' + e.message; } }
    }
    render() {
      const L = this.list();
      R.window(40, 30, 560, 420);
      R.text('DEBUG — ' + this.page + (L.length ? `  (${this.idx + 1}/${L.length})` : ''), 60, 44, { size: 15, color: R.COL.yellow });
      L.slice(this.top, this.top + 12).forEach(([label], k) => { const i = this.top + k; R.text(label.slice(0, 60), 84, 76 + k * 28, { size: 15 }); if (i === this.idx) R.cursor(76, 86 + k * 28); });
      if (!L.length) R.text('(nothing here yet)', 84, 76, { color: R.COL.gray });
      R.text(this.msg || 'OK select · Esc back · Shift x10 · ←/→ page', 60, 424, { size: 12, color: R.COL.gray });
    }
  }
  FF7.scenes.openDebug = function () {
    if (FF7.sceneMgr.layer.some(w => w instanceof DebugMenu && !w.done)) return;
    FF7.sceneMgr.addWidget(new DebugMenu());
  };
  // F2 opens the debug menu when running with ?debug
  const S = FF7.sceneMgr, baseUpdate = S.update;
  S.update = function () {
    if (FF7.DEBUG && FF7.input.pressed('debug') && FF7.state) FF7.scenes.openDebug();
    return baseUpdate.apply(this, arguments);
  };
})();

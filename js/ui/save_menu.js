// Save / load screen (15 slots, like a PS1 memory card file) + export/import.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui;

  class SavePanel {
    constructor(menu, opts = {}) {
      this.menu = menu; this.opts = opts; this.mode = opts.mode || 'save';
      this.top = 0;
      this.confirm = null; this.msg = null; this.done = false;
      this.build();
      const last = FF7.save.lastSlot();
      this.idx = Math.max(0, this.order.indexOf(Math.max(0, last)));
      // (loading: the Autosave file first when it is newer than the last file saved; the old DEMO file when nothing else)
      if (this.auto && !(this.list[last] && this.list[last].date >= (this.auto.date || 0))) this.idx = 0;
      else if (this.demo && !this.auto && !this.list.some(Boolean)) this.idx = this.order.indexOf('demo');
      // while the runner plays (Demo mode) it saves like a player, into its own file: a real slot
      // (FF7.save.demoSlot: its tagged file, else the first empty one), so it can be continued any time
      this.demoSave = this.mode === 'save' && !!(FF7.runner && FF7.runner.active && FF7.runner.saveFromMenu && FF7.save.demoSlot);
      this.demoRow = this.demoSave ? this.order.indexOf(FF7.save.demoSlot()) : this.demo ? this.order.indexOf('demo') : null;
    }
    // the rows: (loading) the Autosave file (Config > Autosave, js/ui/qol.js), the 15 files, export, import, (loading)
    // an older Demo's own file. Saving, a file's row is its number (the runner's menus rely on it)
    build() {
      this.list = FF7.save.list();
      this.auto = this.mode === 'load' && FF7.save.autoSummary ? FF7.save.autoSummary() : null;
      this.demo = this.mode === 'load' && FF7.save.demoSummary ? FF7.save.demoSummary() : null;
      this.order = (this.auto ? ['auto'] : []).concat([...Array(FF7.save.SLOTS).keys()], ['export', 'import'], this.demo ? ['demo'] : []);
      this.rows = this.order.length;
    }
    close() { if (this.menu && this.menu.popPanel) this.menu.popPanel(); else this.done = true; }
    update() {
      if (this.msg) { if (I.pressed('ok') || I.back()) { const after = this.msgAfter; this.msg = null; this.msgAfter = null; if (after) after(); } return; }
      if (this.confirm) {
        if (I.repeat('up') || I.repeat('down')) { this.confirm.idx = 1 - this.confirm.idx; FF7.audio.sfx('cursor'); }
        if (I.back()) { this.confirm = null; FF7.audio.sfx('cancel'); return; }
        if (I.pressed('ok')) { const c = this.confirm; this.confirm = null; if (c.idx === 0) c.fn(); else FF7.audio.sfx('cancel'); }
        return;
      }
      if (I.repeat('up')) { this.idx = (this.idx + this.rows - 1) % this.rows; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % this.rows; FF7.audio.sfx('cursor'); }
      if (this.idx < this.top) this.top = this.idx; if (this.idx >= this.top + 5) this.top = this.idx - 4;
      if (I.back()) { FF7.audio.sfx('cancel'); this.result = false; this.close(); return; }
      if (I.pressed('square') && this.canDelete()) { this.askDelete(); return; }
      if (!I.pressed('ok')) return;
      const row = this.order[this.idx];
      if (row === 'export') { FF7.save.exportAll(); this.msg = 'Memory card exported to a file.'; return; }
      if (row === 'import') { FF7.save.importAll(ok => { const was = row; this.build(); this.idx = Math.max(0, this.order.indexOf(was)); this.msg = ok ? 'Memory card imported.' : 'Import failed.'; }); return; }
      if (this.demoSave && this.idx === this.demoRow) {
        const doDemo = () => {
          const ok = FF7.runner.saveFromMenu('Save screen');
          this.list = FF7.save.list();
          FF7.audio.sfx(ok ? 'save' : 'error');
          this.msg = ok ? 'Saved.' : 'Could not save!';
          this.result = ok;
          this.msgAfter = () => { if (this.opts.closeAfter !== false) this.close(); };
        };
        if (this.list[this.idx]) this.confirm = { idx: 0, fn: doDemo, text: 'Overwrite this file?' };
        else doDemo();
        return;
      }
      if (row === 'demo' || row === 'auto') { const st = FF7.save.read(row); if (!st) { this.msg = 'This file is damaged.'; return; } FF7.audio.sfx('save'); this.done = true; FF7.loadState(st); return; }
      const slot = row;
      if (this.mode === 'save') {
        const doSave = () => {
          const ok = FF7.save.write(slot);
          this.list = FF7.save.list();
          FF7.audio.sfx(ok ? 'save' : 'error');
          this.msg = ok ? 'Saved.' : 'Could not save!';
          this.result = ok;
          this.msgAfter = () => { if (this.opts.closeAfter !== false) this.close(); };
        };
        if (this.list[slot]) this.confirm = { idx: 1, fn: doSave, text: 'Overwrite this file?' };
        else doSave();
      } else {
        if (!this.list[slot]) { FF7.audio.sfx('error'); return; }
        const st = FF7.save.read(slot);
        if (!st) { this.msg = 'This file is damaged.'; return; }
        FF7.audio.sfx('save');
        this.done = true;
        FF7.loadState(st);
      }
    }
    // Square (D): delete the file under the cursor, after a Yes / No (No first). Not while the Demo plays: it drives
    // this screen itself
    canDelete() { return !(FF7.runner && FF7.runner.active); }
    fileAt(i) { const row = this.order[i]; return row === 'auto' ? this.auto : row === 'demo' ? this.demo : typeof row === 'number' ? this.list[row] : null; }
    askDelete() {
      const row = this.order[this.idx];
      if (!this.fileAt(this.idx)) { FF7.audio.sfx('error'); return; }
      this.confirm = { idx: 1, text: 'Delete this file?', fn: () => {
        const ok = FF7.save.remove(row);
        FF7.audio.sfx(ok ? 'confirm' : 'error');
        this.build();
        this.idx = Math.max(0, Math.min(this.idx, this.rows - 1));
        this.msg = ok ? 'File deleted.' : 'Could not delete!';
      } };
    }
    render() {
      R.fill('#000000', 1);
      R.window(0, 0, FF7.W, 44);
      R.text(this.opts.msg || (this.mode === 'save' ? 'Select a file to save to.' : 'Select a file to load.'), 20, 12);
      if (this.canDelete()) R.text(I.label('square') + ': delete a file', FF7.W - 20, 15, { size: 13, align: 'right', color: R.COL.gray });
      R.window(0, 48, FF7.W, 432);
      for (let k = 0; k < 5; k++) {
        const i = this.top + k; if (i >= this.rows) break;
        const y = 58 + k * 84, row = this.order[i];
        if (row === 'export' || row === 'import') { R.text(row === 'export' ? 'Export memory card (download .json)' : 'Import memory card (.json)', 60, y + 28, { color: R.COL.cyan }); }
        else {
          const s = row === 'demo' ? this.demo : row === 'auto' ? this.auto : this.list[row];
          R.text(row === 'demo' ? 'DEMO' : row === 'auto' ? 'Autosave' : 'File ' + U.pad(row + 1, 2, '0'), 44, y + 4, { size: 14, color: row === 'demo' ? R.COL.yellow : row === 'auto' ? R.COL.green : R.COL.cyan });
          if (s && s.demo && typeof row === 'number') R.text('Demo', 44, y + 56, { size: 12, color: R.COL.yellow });   // the Demo's file
          if (!s) R.text('Empty', 60, y + 30, { color: R.COL.gray });
          else {
            (s.party || []).filter(Boolean).forEach((id, j) => { const img = R.portrait(id); if (img) R.img(img, 130 + j * 58, y + 6, 54, 54); });
            R.text(s.leaderName, 320, y + 6); R.text('Level ' + s.level, 320, y + 32, { size: 15, color: R.COL.cyan });
            // (the place fits between x 440 and the disc label, with a gap: smaller type, then cut short)
            const discW = s.disc ? R.measure('Disc ' + s.disc, 13) + 14 : 0;
            R.textFit(s.location || '', 440, y + 6, 180 - discW, { size: 15, minSize: 12 });
            R.text('Time ' + U.fmtTime(s.time), 440, y + 32, { size: 14 });
            R.text(U.fmtNum(s.gil) + ' gil', 620, y + 32, { size: 14, align: 'right' });
            if (s.disc) R.text('Disc ' + s.disc, 620, y + 6, { size: 13, align: 'right', color: R.COL.gray });
          }
        }
        if (i === this.idx) R.cursor(36, y + 38);
      }
      if (this.confirm) { R.window(200, 180, 240, 110); R.text(this.confirm.text, 320, 194, { align: 'center', size: 16 }); R.text('Yes', 290, 226); R.text('No', 290, 254); R.cursor(284, 236 + this.confirm.idx * 28); }
      if (this.msg) { R.window(160, 200, 320, 60); R.text(this.msg, 320, 220, { align: 'center' }); }
    }
  }
  UI.SavePanel = SavePanel;

  // Modal widget version for scripts / title screen: yields when closed (result = saved?)
  UI.saveMenu = function (opts = {}) {
    const p = new SavePanel(null, opts);
    const w = { modal: true, done: false, aboveFade: !!opts.aboveFade, panel: p,
      update(focus) { if (focus) p.update(); if (p.done) { this.done = true; this.result = p.result; } },
      render() { p.render(); } };
    return FF7.sceneMgr.addWidget(w);
  };
})();

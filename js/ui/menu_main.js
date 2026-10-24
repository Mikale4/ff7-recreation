// FF7 main menu (Triangle): party overview + command list, and the small sub-screens
// (Order, Limit, Config, PHS, Quit). Other sub-screens live in menu_*.js.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input;
  const UI = FF7.ui;
  const CMDS = ['Item', 'Magic', 'Materia', 'Equip', 'Status', 'Order', 'Limit', 'Config', 'PHS', 'Save', 'Quit'];

  // Base for menu panels: update() returns nothing; call this.close() to pop.
  class Panel {
    constructor(menu) { this.menu = menu; }
    close() { this.menu.popPanel(); }
  }
  UI.Panel = Panel;

  // Draw a character summary block (portrait, name, LV, HP, MP)
  UI.drawCharBlock = function (c, x, y, opts = {}) {
    if (!c) return;
    const img = R.portrait(c.id);
    const pw = opts.small ? 56 : 76;
    if (img) R.img(img, x, y, pw, pw, { alpha: c.hp <= 0 ? 0.5 : 1 });
    else { R.ctx.fillStyle = '#203060'; R.ctx.fillRect(x, y, pw, pw); }
    const tx = x + pw + 14;
    R.text(c.name, tx, y + 2, { color: c.hp <= 0 ? R.COL.red : R.COL.white });
    // PS1 layout: each bar sits just under its own numbers, with a gap before the next line
    const L = opts.small ? { lv: 24, hp: 44, hpBar: 61, mp: 68, mpBar: 85 } : { lv: 27, hp: 50, hpBar: 67, mp: 76, mpBar: 93 };
    R.text('LV', tx, y + L.lv, { size: 14, color: R.COL.cyan }); R.text(String(c.level), tx + 50, y + L.lv - 2, { align: 'right' });
    R.text('HP', tx, y + L.hp, { size: 14, color: R.COL.cyan });
    R.text(`${c.hp}/ ${c.maxHp}`, tx + 150, y + L.hp - 2, { align: 'right', size: 16, color: c.hp <= 0 ? R.COL.red : c.hp < c.maxHp / 4 ? R.COL.yellow : R.COL.white });
    R.hpBar(tx + 28, y + L.hpBar, 122, c.maxHp ? c.hp / c.maxHp : 0);
    if (!opts.noMp) {
      R.text('MP', tx, y + L.mp, { size: 14, color: R.COL.cyan });
      R.text(`${c.mp}/ ${c.maxMp}`, tx + 150, y + L.mp - 2, { align: 'right', size: 16 });
      R.mpBar(tx + 28, y + L.mpBar, 122, c.maxMp ? c.mp / c.maxMp : 0);
    }
  };

  class MainMenu {
    constructor() {
      this.cursor = 0;
      this.panels = [];
      this.t = 0;
      this.noClock = false;
      this.charSel = null;       // { cb, idx } choosing a party member for a command
    }
    enter() { FF7.audio.sfx('cursor'); }
    pushPanel(p) { this.panels.push(p); FF7.input.consume(); }
    popPanel() { this.panels.pop(); FF7.input.consume(); }
    party() { return FF7.state.party.filter(Boolean).map(id => FF7.state.chars[id]).filter(Boolean); }
    editable() { return this.party().filter(c => !FF7.isGuest(c.id)); }   // (Equip, Materia: L1 / R1 skip the guests)
    update(canInput) {
      this.t++;
      if (!canInput) return;
      const top = this.panels[this.panels.length - 1];
      if (top) { top.update(); return; }
      if (this.charSel) return this.updateCharSel();
      if (I.back()) { FF7.audio.sfx('cancel'); FF7.sceneMgr.pop(); return; }
      if (I.repeat('up')) { this.cursor = (this.cursor + CMDS.length - 1) % CMDS.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.cursor = (this.cursor + 1) % CMDS.length; FF7.audio.sfx('cursor'); }
      if (I.pressed('ok')) {
        const cmd = CMDS[this.cursor];
        if (!this.enabled(cmd)) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        switch (cmd) {
          case 'Item': this.pushPanel(new UI.ItemPanel(this)); break;
          case 'Magic': this.selectChar(c => this.pushPanel(new UI.MagicPanel(this, c))); break;
          // (a guest's gear and materia are their own: nothing to change, nothing to lose when they go)
          case 'Materia': this.selectChar(c => { if (FF7.isGuest(c.id)) { FF7.audio.sfx('error'); return; } this.pushPanel(new UI.MateriaPanel(this, c)); }); break;
          case 'Equip': this.selectChar(c => { if (FF7.isGuest(c.id)) { FF7.audio.sfx('error'); return; } this.pushPanel(new UI.EquipPanel(this, c)); }); break;
          case 'Status': this.selectChar(c => this.pushPanel(new UI.StatusPanel(this, c))); break;
          case 'Order': this.pushPanel(new OrderPanel(this)); break;
          case 'Limit': this.selectChar(c => this.pushPanel(new LimitPanel(this, c))); break;
          case 'Config': this.pushPanel(new ConfigPanel(this)); break;
          case 'PHS': this.pushPanel(new PhsPanel(this)); break;
          case 'Save': this.pushPanel(new UI.SavePanel(this, { mode: 'save' })); break;
          case 'Quit': this.pushPanel(new QuitPanel(this)); break;
        }
      }
    }
    enabled(cmd) {
      const st = FF7.state;
      if (cmd === 'PHS') return st.phsEnabled;
      if (cmd === 'Save') return FF7.saveNearby || st.loc.mode === 'world' || FF7.DEBUG;
      return true;
    }
    selectChar(fn) { this.charSel = { fn, idx: 0 }; }
    updateCharSel() {
      const n = this.party().length;
      if (I.repeat('up')) { this.charSel.idx = (this.charSel.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.charSel.idx = (this.charSel.idx + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.charSel = null; return; }
      if (I.pressed('ok')) { FF7.audio.sfx('confirm'); const c = this.party()[this.charSel.idx]; const fn = this.charSel.fn; this.charSel = null; fn(c); }
    }
    render() {
      R.clear();
      const top = this.panels[this.panels.length - 1];
      if (top) { top.render(); return; }
      this.renderMain();
    }
    renderMain() {
      const st = FF7.state;
      R.window(0, 0, 480, 400);
      this.party().forEach((c, i) => {
        const y = 22 + i * 124;
        UI.drawCharBlock(c, 22, y);
        // next level / limit level bars
        R.text('next level', 300, y + 6, { size: 13, color: R.COL.cyan });
        const cur = c.xp - FF7.sys.stats.xpFor(c.id, c.level), need = FF7.sys.stats.xpFor(c.id, c.level + 1) - FF7.sys.stats.xpFor(c.id, c.level);
        R.bar(300, y + 26, 150, 6, need > 0 ? cur / need : 1, '#c03030', '#ff8080');
        R.text('Limit level', 300, y + 42, { size: 13, color: R.COL.cyan });
        R.text(String(c.limitLevel), 450, y + 40, { align: 'right', size: 16 });
        R.bar(300, y + 64, 150, 6, (c.limitGauge || 0) / 255, '#a03080', '#ff90d0');
        if (c.row === 'back') R.text('(back row)', 300, y + 80, { size: 12, color: R.COL.gray });
        if (this.charSel && this.charSel.idx === i) R.cursor(18, y + 36);
      });
      R.window(488, 0, 152, CMDS.length * 25 + 18);
      CMDS.forEach((cmd, i) => {
        R.text(cmd, 520, 10 + i * 25, { color: this.enabled(cmd) ? R.COL.white : R.COL.gray });
        if (i === this.cursor && !this.charSel) R.cursor(514, 21 + i * 25);
      });
      // time / gil
      R.window(488, 318, 152, 82);
      R.text('Time', 500, 330, { size: 15, color: R.COL.cyan }); R.text(U.fmtTime(st.time), 628, 330, { align: 'right', size: 16 });
      R.text('Gil', 500, 360, { size: 15, color: R.COL.cyan }); R.text(U.fmtNum(st.gil), 628, 360, { align: 'right', size: 16 });
      // location
      R.window(300, 408, 340, 40);
      R.text(st.locName || '', 470, 418, { align: 'center' });
      // Config > Hints (js/ui/qol.js): the story's next objective and the treasure left on this map
      if (FF7.qol && FF7.qol.on('hints')) {
        if (this.hint === undefined) this.hint = { obj: FF7.qol.objective(), here: FF7.qol.treasure() };
        const h = this.hint, W = 226;
        R.window(0, 406, 294, 74);
        R.text('Next', 10, 414, { size: 13, color: R.COL.cyan });
        const lines = R.wrap(h.obj || 'Nothing more to do on the route', W, 13);
        lines.slice(0, 2).forEach((t, i) => R.text(i === 1 && lines.length > 2 ? t.replace(/\s*\S*$/, '') + '…' : t, 58, 414 + i * 17, { size: 13 }));
        if (h.here) {
          R.text('Here', 10, 452, { size: 13, color: R.COL.cyan });
          let t = h.here.length ? h.here.join(', ') : 'no treasure left';
          if (R.measure(t, 13) > W) { while (t.length > 4 && R.measure(t + '…', 13) > W) t = t.slice(0, -1); t = t.replace(/,?\s*$/, '') + '…'; }
          R.text(t, 58, 452, { size: 13, color: h.here.length ? R.COL.white : R.COL.gray });
        }
      }
    }
  }
  UI.MainMenu = MainMenu;
  UI.openMainMenu = function () { FF7.sceneMgr.push(new MainMenu()); };

  // ---------------------------------------------------------------- Order (swap order / row)
  class OrderPanel extends Panel {
    constructor(m) { super(m); this.idx = 0; this.sel = -1; }
    update() {
      const party = FF7.state.party;
      const n = party.filter(Boolean).length;
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); if (this.sel >= 0) this.sel = -1; else this.close(); return; }
      if (I.pressed('ok')) {
        if (this.sel < 0) { this.sel = this.idx; FF7.audio.sfx('confirm'); }
        else if (this.sel === this.idx) { const c = FF7.state.chars[party[this.idx]]; c.row = c.row === 'front' ? 'back' : 'front'; FF7.audio.sfx('set'); this.sel = -1; }
        else { const t = party[this.sel]; party[this.sel] = party[this.idx]; party[this.idx] = t; FF7.audio.sfx('set'); this.sel = -1; if (FF7.fieldScene) FF7.fieldScene.api.refreshLeader(); }
      }
    }
    render() {
      this.menu.renderMain();
      R.window(120, 40, 400, 40); R.text('Order: choose twice to change row', 320, 50, { align: 'center', size: 16 });
      const party = FF7.state.party.filter(Boolean);
      party.forEach((id, i) => { if (i === this.idx) R.cursor(18, 22 + i * 124 + 36); if (i === this.sel) R.cursor(8, 22 + i * 124 + 36, { still: true, alpha: 0.6 }); });
    }
  }

  // ---------------------------------------------------------------- Limit (choose limit level, view limits)
  class LimitPanel extends Panel {
    constructor(m, c) { super(m); this.c = c; this.idx = (c.limitLevel || 1) - 1; }
    levels() { const L = FF7.data.limits; const lv = new Set(); for (const id of this.c.limitsKnown) if (L[id]) lv.add(L[id].level); return [1, 2, 3, 4].filter(l => lv.has(l)); }
    update() {
      const lv = this.levels();
      if (I.repeat('up')) { this.idx = Math.max(0, this.idx - 1); FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = Math.min(3, this.idx + 1); FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('ok')) { if (lv.includes(this.idx + 1)) { this.c.limitLevel = this.idx + 1; this.c.limitGauge = 0; FF7.audio.sfx('set'); } else FF7.audio.sfx('error'); }
    }
    render() {
      R.window(0, 0, FF7.W, 110); UI.drawCharBlock(this.c, 16, 14, { small: true });
      R.window(0, 116, FF7.W, 364);
      const L = FF7.data.limits;
      for (let lv = 1; lv <= 4; lv++) {
        const y = 132 + (lv - 1) * 84;
        R.text('LV ' + lv, 40, y, { color: this.c.limitLevel === lv ? R.COL.yellow : R.COL.cyan });
        const ids = Object.keys(L).filter(id => L[id].char === this.c.id && L[id].level === lv);
        ids.forEach((id, k) => {
          const known = this.c.limitsKnown.includes(id);
          R.text(known ? L[id].name : '??????', 140 + k * 220, y, { color: known ? R.COL.white : R.COL.gray });
          const pr = !known && FF7.qol && FF7.qol.on('limitProgress') ? limitProgress(this.c, L[id]) : null;
          if (pr) R.text(pr, 140 + k * 220, y + 24, { size: 12, color: R.COL.cyan });
        });
        if (this.idx === lv - 1) R.cursor(34, y + 10);
      }
      R.text('Set limit level (the gauge resets)', 40, 460, { size: 13, color: R.COL.gray });
    }
  }

  // Config > Limit Progress: how close a limit not learned yet is (FF7's hidden counters: its uses of the level's
  // first limit, or the character's kills; the level 4 limits come from their manuals)
  function limitProgress(c, l) {
    const rule = String(l.learn || '');
    if (rule.startsWith('uses:')) {
      const [, lid, n] = rule.split(':'), t = FF7.data.limits[lid];
      if (!c.limitsKnown.includes(lid)) return 'Learn the first, then use it ' + n + '×';   // (its name stays hidden)
      return 'Use ' + (t ? t.name : lid) + ': ' + Math.min(+n, (c.limitUses || {})[lid] || 0) + ' / ' + n;
    }
    if (rule.startsWith('kills:')) { const n = +rule.split(':')[1]; return 'Kills: ' + Math.min(n, c.kills || 0) + ' / ' + n; }
    if (l.level === 4 || /manual/.test(rule)) return 'Learned from its manual';
    return null;
  }

  // ---------------------------------------------------------------- Config
  // Config: the options in tabs (Battle, Field, System, Extras, Controls). The cursor starts on the tab bar:
  // left / right pick a tab there, down goes into its options; L1 / R1 switch tabs from anywhere. In the options,
  // left / right (or OK) change the value; the box at the bottom says what the one under the cursor does.
  // Controls is the rebinding table (BindTable below).
  const CONFIG_TABS = ['Battle', 'Field', 'System', 'Extras', 'Controls'];
  class ConfigPanel extends Panel {
    constructor(m) { super(m); this.tab = 0; this.idx = -1; }   // (idx -1: the tab bar)
    close() { FF7.prefs.save(FF7.state.config); super.close(); }   // (kept for every file: FF7.prefs)
    tabs() { return CONFIG_TABS; }
    // the tab an option is on (by its label; the Demo's Config steps find Run this way: js/runner/menus.js)
    tabOf(label) { return CONFIG_TABS.findIndex((_, t) => this.items(t).some(it => it[0] === label)); }
    // [label, value shown, change(d), help] for a tab (the current one by default)
    items(tab = this.tab) {
      const c = FF7.state.config;
      const toggle = (label, key, help) => [label, c[key] !== false ? 'On' : 'Off', () => { c[key] = c[key] === false; if (key === 'fastForward' && !c[key]) FF7.timeScale = 1; }, help];
      switch (CONFIG_TABS[tab]) {
        case 'Battle': return [
          ['ATB', c.atb === 'active' ? 'Active' : c.atb === 'wait' ? 'Wait' : 'Recommended', (d) => { const o = ['active', 'recommended', 'wait']; c.atb = o[(o.indexOf(c.atb) + d + 3) % 3]; },
            'Active: time runs while you choose. Recommended: it stops in the sub-menus. Wait: in every menu.'],
          ['Battle Speed', bar(c.battleSpeed), (d) => { c.battleSpeed = U.clamp(c.battleSpeed + d * 0.1, 0, 1); }, 'How fast the ATB gauges fill.'],
          ['Cursor', c.cursor === 'memory' ? 'Memory' : 'Initial', () => { c.cursor = c.cursor === 'memory' ? 'initial' : 'memory'; },
            'Initial: the battle cursor starts on the first command. Memory: on the last one used.'],
          ['Random Battles', c.encounters === 'off' ? 'Off' : c.encounters === 'half' ? 'Half' : 'Normal', (d) => { const o = ['normal', 'half', 'off']; c.encounters = o[(o.indexOf(c.encounters) + d + 3) % 3]; },
            'How often random battles happen.'],
          // (quality of life, not in the PS1 game: js/ui/qol.js)
          toggle('Sense Details', 'senseDetails', "Sense also shows an enemy's elemental weaknesses and resistances."),
          toggle('Limit Progress', 'limitProgress', 'The Limit screen shows how close each character is to the next Limit.'),
        ];
        case 'Field': return [
          ['Field Message Speed', bar(c.fieldMsgSpeed), (d) => { c.fieldMsgSpeed = U.clamp(c.fieldMsgSpeed + d * 0.1, 0, 1); }, 'How fast the text of the dialogue boxes comes up.'],
          ['Run', c.alwaysRun ? 'Always (hold ' + I.label('run') + ' to walk)' : 'Hold ' + I.label('run'), () => { c.alwaysRun = !c.alwaysRun; },
            'Always: run everywhere, hold ' + I.label('run') + ' to walk. Hold ' + I.label('run') + ': walk, hold it to run.'],
          ['Exit Markers', c.exitMarkers ? 'On' : 'Off', () => { c.exitMarkers = !c.exitMarkers; }, "Markers over each area's exits."],
          toggle('Hints (menu)', 'hints', 'The main menu shows the next objective and the treasure still in the area.'),
          toggle('Chocobo Details', 'chocoboDetails', "Chocobo cards show each bird's hidden limits and what it needs next."),
        ];
        case 'System': return [
          ['Music Volume', bar(c.musicVol), (d) => { c.musicVol = U.clamp(c.musicVol + d * 0.1, 0, 1); FF7.audio.musicVol = c.musicVol; }, 'The volume of the music.'],
          ['Sound Volume', bar(c.sfxVol), (d) => { c.sfxVol = U.clamp(c.sfxVol + d * 0.1, 0, 1); FF7.audio.sfxVol = c.sfxVol; FF7.audio.sfx('cursor'); }, 'The volume of the sound effects.'],
          ['Window Color', '', (d) => { const presets = [['#0058b0', '#000080', '#000050', '#002040'], ['#406020', '#203010', '#102008', '#304010'], ['#803030', '#401818', '#300c0c', '#502020'], ['#505060', '#303038', '#202028', '#404048']]; const i = presets.findIndex(p => p[0] === c.windowColors[0]); c.windowColors = presets[(i + d + presets.length) % presets.length].slice(); },
            'The color of the menu windows.'],
          toggle('Fast-Forward (' + I.label('ff') + ')', 'fastForward', I.label('ff') + ' cycles the game speed: 1×, 2×, 4×, 8×.'),
          toggle('Autosave', 'autosave', 'Saves to a file of its own on each new area. The Load screen lists it first.'),
        ];
        case 'Extras': return [   // (story scenes that are not in the PS1 game)
          toggle('AVALANCHE Scenes', 'avalancheScenes', 'Play alongside Jessie, Biggs and Wedge in two early scenes.'),   // (js/maps/c1/reactor1.js, c3/part3.js)
          toggle('Turks Join', 'turksJoin', 'Reno, Rude and Elena can join the party late in the story.'),              // (js/maps/extra/turks.js)
          toggle('Playable Flashbacks', 'flashbacks', "Play two of the story's flashbacks instead of watching them."),   // (js/maps/c6a/part4.js, extra/flashbacks.js)
          toggle("Cait Sith's Hideout", 'caitHideout', 'Cait Sith keeps a secret or two at the Gold Saucer.'),        // (js/maps/extra/cait_hideout.js)
        ];
      }
      return [];   // (Controls: the table, nothing to change)
    }
    isControls() { return CONFIG_TABS[this.tab] === 'Controls'; }
    setTab(t) {
      const n = CONFIG_TABS.length;
      this.tab = (t + n) % n;
      const len = this.isControls() ? 1 : this.items().length;
      this.idx = len ? Math.min(this.idx, len - 1) : -1;
      FF7.audio.sfx('cursor');
    }
    update() {
      const bt = this.binds || (this.binds = new BindTable());
      if (bt.busy()) { bt.update(); return; }   // (listening for a key, or its Reset question)
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('l1')) { this.setTab(this.tab - 1); return; }
      if (I.pressed('r1')) { this.setTab(this.tab + 1); return; }
      if (this.isControls() && this.idx >= 0) { const r = bt.update(); if (r === 'top') { this.idx = -1; FF7.audio.sfx('cursor'); } return; }
      const it = this.items(), n = this.isControls() ? 1 : it.length;
      if (this.idx < 0) {   // the tab bar
        if (I.repeat('left')) this.setTab(this.tab - 1);
        else if (I.repeat('right')) this.setTab(this.tab + 1);
        else if (n && (I.repeat('down') || I.pressed('ok'))) { this.idx = 0; if (this.isControls()) bt.row = 0; FF7.audio.sfx('cursor'); }
        else if (n && I.repeat('up')) { this.idx = n - 1; if (this.isControls()) bt.row = bt.rows() - 1; FF7.audio.sfx('cursor'); }
        return;
      }
      if (I.repeat('up')) { this.idx--; FF7.audio.sfx('cursor'); return; }                              // (from the first: the tab bar)
      if (I.repeat('down')) { this.idx = this.idx + 1 < n ? this.idx + 1 : -1; FF7.audio.sfx('cursor'); return; }
      if (I.repeat('left')) { it[this.idx][2](-1); FF7.audio.sfx('cursor'); }
      if (I.repeat('right') || I.pressed('ok')) { it[this.idx][2](1); FF7.audio.sfx('cursor'); }
    }
    render() {
      R.window(0, 0, FF7.W, 44); R.text('Config', 20, 12);
      R.text(I.label('l1') + ' / ' + I.label('r1') + ': switch tabs', FF7.W - 20, 15, { size: 13, align: 'right', color: R.COL.gray });
      // the tab bar
      R.window(0, 48, FF7.W, 44);
      const n = CONFIG_TABS.length, tw = FF7.W / n, c = R.ctx;
      CONFIG_TABS.forEach((name, t) => {
        const cx = tw * t + tw / 2, on = t === this.tab;
        if (on) {
          c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(Math.round(tw * t + 8), 54, Math.round(tw - 16), 32);
          c.fillStyle = R.COL.cyan; c.fillRect(Math.round(cx - 30), 82, 60, 2);
        }
        R.text(name, cx, 60, { align: 'center', size: 16, color: on ? R.COL.white : R.COL.gray });
      });
      if (this.idx < 0) R.cursor(Math.round(tw * this.tab + tw / 2 - R.measure(CONFIG_TABS[this.tab], 16) / 2 - 8), 70);
      R.window(0, 96, FF7.W, 384);
      if (this.isControls()) { (this.binds || (this.binds = new BindTable())).draw(this.idx >= 0); return; }
      const it = this.items();
      it.forEach(([k, v], j) => {
        R.text(k, 50, 118 + j * 42, { color: R.COL.cyan });
        R.text(v, 380, 118 + j * 42);
        if (j === this.idx) R.cursor(44, 128 + j * 42);
      });
      // what the option under the cursor does
      const help = this.idx >= 0 && it[this.idx] && it[this.idx][3];
      if (help) {
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(12, 420, FF7.W - 24, 50);
        R.wrap(help, FF7.W - 48, 14).slice(0, 2).forEach((l, i) => R.text(l, 24, 426 + i * 20, { size: 14, color: R.COL.gray }));
      } else if (this.idx < 0) R.text('Down: the options on this tab.', 24, 440, { size: 14, color: R.COL.gray });
    }
  }

  UI.ConfigPanel = ConfigPanel;
  // Config on the title screen: the same panel, on a screen of its own (the settings are shared: FF7.prefs)
  class TitleConfig {
    constructor() { this.noClock = true; this.panels = [new ConfigPanel(this)]; }
    enter() { FF7.input.consume(); }
    pushPanel(p) { this.panels.push(p); FF7.input.consume(); }
    popPanel() { this.panels.pop(); FF7.input.consume(); if (!this.panels.length) FF7.sceneMgr.pop(); }
    update(canInput) { const p = this.panels[this.panels.length - 1]; if (canInput && p) p.update(); }
    render() { R.clear(); const p = this.panels[this.panels.length - 1]; if (p) p.render(); }
  }
  UI.openConfig = () => FF7.sceneMgr.push(new TitleConfig());

  // ---------------------------------------------------------------- Config > Controls: rebinding
  // Every button of the game (js/core/input.js) with its two keys and its gamepad button. OK on a cell listens for
  // the next key (the Gamepad column: the next pad button) for 5 seconds; Square clears the cell (a menu button keeps one
  // key); the last row puts every default back. A key another button had moves over (that button gets this cell's old
  // key). Kept per browser, for every save file.
  const BIND_SHOWN = 13, BIND_Y = 128, BIND_H = 22, BIND_X = [300, 410, 520];
  class BindTable {
    constructor() { this.row = 0; this.col = 0; this.top = 0; this.listen = null; this.note = null; this.confirm = null; }
    rows() { return I.BINDABLE.length + 1; }   // (+ Reset to Defaults)
    busy() { return !!(this.listen || this.confirm); }
    say(text) { this.note = { text, t: 240 }; }
    update() {
      if (this.note && --this.note.t <= 0) this.note = null;
      if (this.listen) {   // (the input goes to the capture; the wait runs out after 5 seconds)
        if (--this.listen.t <= 0) { I.cancelCapture(); this.listen = null; FF7.audio.sfx('cancel'); this.say('Nothing pressed: left as it was.'); }
        return;
      }
      if (this.confirm) {
        if (I.repeat('up') || I.repeat('down')) { this.confirm.idx = 1 - this.confirm.idx; FF7.audio.sfx('cursor'); }
        if (I.back()) { this.confirm = null; FF7.audio.sfx('cancel'); return; }
        if (I.pressed('ok')) {
          const yes = this.confirm.idx === 0; this.confirm = null;
          if (yes) { I.resetBindings(); FF7.audio.sfx('confirm'); this.say('Every control is back to its default.'); } else FF7.audio.sfx('cancel');
        }
        return;
      }
      const n = this.rows(), reset = this.row === n - 1;
      if (I.repeat('up')) { if (this.row === 0) return 'top'; this.row--; FF7.audio.sfx('cursor'); }
      else if (I.repeat('down')) { if (this.row === n - 1) return 'top'; this.row++; FF7.audio.sfx('cursor'); }
      else if (I.repeat('left') && !reset) { this.col = (this.col + 2) % 3; FF7.audio.sfx('cursor'); }
      else if (I.repeat('right') && !reset) { this.col = (this.col + 1) % 3; FF7.audio.sfx('cursor'); }
      else if (I.pressed('ok')) {
        if (reset) { this.confirm = { idx: 1 }; FF7.audio.sfx('cursor'); }
        else this.startListen();
      } else if (I.pressed('square') && !reset) {
        const [b] = I.BINDABLE[this.row], r = this.col === 2 ? I.clearPad(b) : I.clearKey(b, this.col);
        FF7.audio.sfx(r.ok ? 'cancel' : 'error');
        if (r.msg) this.say(r.msg);
      }
      if (this.row < this.top) this.top = this.row;
      if (this.row >= this.top + BIND_SHOWN) this.top = this.row - BIND_SHOWN + 1;
    }
    startListen() {
      const [b] = I.BINDABLE[this.row], col = this.col;
      this.listen = { b, col, t: 300, wrong: false };
      this.note = null;
      FF7.audio.sfx('confirm');
      const arm = () => I.capture(res => {
        if (!this.listen) return;
        // (a key in the Gamepad column, or a pad button in a key column: keep listening)
        if ((col === 2) !== (res.pad != null)) { this.listen.wrong = true; arm(); return; }
        const r = col === 2 ? I.bindPad(b, res.pad) : I.bindKey(b, col, res.key);
        this.listen = null;
        FF7.audio.sfx(r.ok ? 'set' : 'error');
        if (r.msg) this.say(r.msg);
      });
      arm();
    }
    draw(focus) {
      const c = R.ctx, n = this.rows();
      if (this.row < this.top) this.top = this.row;
      if (this.row >= this.top + BIND_SHOWN) this.top = this.row - BIND_SHOWN + 1;
      R.text('Key 1', BIND_X[0], 104, { size: 13, color: R.COL.gray }); R.text('Key 2', BIND_X[1], 104, { size: 13, color: R.COL.gray });
      R.text('Gamepad', BIND_X[2], 104, { size: 13, color: R.COL.gray });
      for (let j = 0; j < BIND_SHOWN; j++) {
        const i = this.top + j; if (i >= n) break;
        const y = BIND_Y + j * BIND_H, sel = focus && i === this.row;
        if (i === n - 1) {
          R.text('Reset to Defaults', 24, y, { size: 14, color: I.isDefault() ? R.COL.gray : R.COL.yellow });
          if (sel) R.cursor(18, y + 8);
          continue;
        }
        const [b, name] = I.BINDABLE[i], k = I.keysOf(b), pd = I.padOf(b);
        R.text(name, 24, y, { size: 14, color: R.COL.cyan });
        [k[0], k[1], pd].forEach((v, col) => {
          const x = BIND_X[col], txt = col === 2 ? I.padName(v) : I.keyName(v);
          if (sel && col === this.col) { c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x - 6, y - 2, 100, 20); }
          R.text(txt || '—', x, y, { size: 14, color: txt ? R.COL.white : R.COL.gray });
        });
        if (sel) R.cursor(BIND_X[this.col] - 8, y + 8);
      }
      if (this.top > 0) R.text('▲', FF7.W - 18, 104, { size: 12, color: R.COL.gray });
      if (this.top + BIND_SHOWN < n) R.text('▼', FF7.W - 18, BIND_Y + BIND_SHOWN * BIND_H - 14, { size: 12, color: R.COL.gray });
      // the line at the bottom: what just happened, or what the keys do here
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(12, 420, FF7.W - 24, 50);
      const help = this.note ? this.note.text
        : focus ? (this.row === n - 1 ? I.label('ok') + ': put every key and button back as it was.'
          : I.label('ok') + ': change   ' + I.label('square') + ': clear   ← →: column.   Two keys and a gamepad button each; kept for every save.')
        : 'Down: rebind the keyboard and gamepad controls.';
      R.wrap(help, FF7.W - 48, 14).slice(0, 2).forEach((l, i) => R.text(l, 24, 426 + i * 20, { size: 14, color: this.note ? R.COL.white : R.COL.gray }));
      if (this.listen) {
        const name = (I.BINDABLE.find(x => x[0] === this.listen.b) || [])[1] || '';
        R.fill('#000', 0.45);
        R.window(120, 176, 400, 118);
        R.text(this.listen.col === 2 ? 'Press a gamepad button for' : 'Press a key for', 320, 192, { align: 'center', size: 16 });
        R.text(name.replace(/ \(.*\)$/, '') + (this.listen.col === 2 ? '' : '  (Key ' + (this.listen.col + 1) + ')'), 320, 218, { align: 'center', size: 16, color: R.COL.cyan });
        R.text(this.listen.wrong ? (this.listen.col === 2 ? 'That was a key: press a gamepad button.' : 'That was a pad button: press a key.') : 'Or wait to leave it as it is (' + Math.ceil(this.listen.t / 60) + ')',
          320, 254, { align: 'center', size: 13, color: R.COL.gray });
      }
      if (this.confirm) {
        R.window(200, 180, 240, 110); R.text('Reset every control?', 320, 194, { align: 'center', size: 16 });
        R.text('Yes', 290, 226); R.text('No', 290, 254); R.cursor(284, 236 + this.confirm.idx * 28);
      }
    }
  }
  function bar(v) { const n = Math.round(v * 10); return '■'.repeat(n) + '□'.repeat(10 - n); }

  // ---------------------------------------------------------------- PHS (party switch)
  class PhsPanel extends Panel {
    constructor(m) { super(m); this.side = 0; this.idx = 0; this.pick = null; }
    reserve() { return FF7.state.members.filter(id => !FF7.state.party.includes(id) && FF7.state.chars[id] && !FF7.isGuest(id) && !FF7.sys.party.isAway(id)); }
    update() {
      const party = FF7.state.party;
      const res = this.reserve();
      const n = this.side === 0 ? 3 : Math.max(1, res.length);
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.pressed('left') || I.pressed('right')) { this.side = 1 - this.side; this.idx = 0; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); if (this.pick) this.pick = null; else this.close(); return; }
      if (I.pressed('ok')) {
        const sel = this.side === 0 ? { side: 0, id: party[this.idx], i: this.idx } : { side: 1, id: res[this.idx], i: this.idx };
        if (!this.pick) { if (sel.side === 0 && sel.id && FF7.state.locked.includes(sel.id)) { FF7.audio.sfx('error'); return; } this.pick = sel; FF7.audio.sfx('confirm'); return; }
        const a = this.pick, b = sel;
        if (a.side !== b.side) {
          const pSel = a.side === 0 ? a : b, rSel = a.side === 1 ? a : b;
          if (pSel.id && FF7.state.locked.includes(pSel.id)) { FF7.audio.sfx('error'); this.pick = null; return; }
          if (rSel.id) { party[pSel.i] = rSel.id; FF7.audio.sfx('set'); }
          else if (pSel.id && party.filter(Boolean).length > 1) { party[pSel.i] = null; FF7.sys.party.compact(); FF7.audio.sfx('set'); }
        } else if (a.side === 0) { const t = party[a.i]; party[a.i] = party[b.i]; party[b.i] = t; FF7.audio.sfx('set'); }
        this.pick = null;
        if (FF7.fieldScene) FF7.fieldScene.api.refreshLeader();
      }
    }
    render() {
      R.window(0, 0, 320, 480); R.window(320, 0, 320, 480);
      R.text('Party', 20, 10, { color: R.COL.cyan }); R.text('Reserve', 340, 10, { color: R.COL.cyan });
      FF7.state.party.forEach((id, i) => { const y = 40 + i * 140; if (id) UI.drawCharBlock(FF7.state.chars[id], 20, y, { small: true, noMp: true }); else R.text('(empty)', 60, y + 30, { color: R.COL.gray }); if (this.side === 0 && this.idx === i) R.cursor(16, y + 30); if (this.pick && this.pick.side === 0 && this.pick.i === i) R.cursor(6, y + 30, { still: true, alpha: 0.5 }); });
      // (the reserve's rows shrink to fit: with the Turks there can be eight)
      const res = this.reserve(), rh = Math.min(70, Math.floor(432 / Math.max(1, res.length))), ps = Math.min(56, rh - 4);
      res.forEach((id, i) => { const y = 40 + i * rh; const c = FF7.state.chars[id]; const img = R.portrait(id); if (img) R.img(img, 340, y, ps, ps); R.text(c.name, 348 + ps + 10, y + Math.max(2, ps / 2 - 18)); R.text('LV ' + c.level, 348 + ps + 10, y + Math.max(20, ps / 2 + 4), { size: 14, color: R.COL.cyan }); if (this.side === 1 && this.idx === i) R.cursor(336, y + ps / 2 - 4); if (this.pick && this.pick.side === 1 && this.pick.i === i) R.cursor(326, y + ps / 2 - 4, { still: true, alpha: 0.5 }); });
    }
  }

  // ---------------------------------------------------------------- Quit
  class QuitPanel extends Panel {
    constructor(m) { super(m); this.idx = 1; }
    update() {
      if (I.repeat('up') || I.repeat('down')) { this.idx = 1 - this.idx; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); return; }
      if (I.pressed('ok')) { if (this.idx === 0) { FF7.audio.stop(40); FF7.sceneMgr.set(new FF7.scenes.Title()); } else this.close(); }
    }
    render() {
      this.menu.renderMain();
      R.window(200, 180, 240, 110); R.text('Quit the game?', 320, 194, { align: 'center' });
      R.text('Yes', 290, 226); R.text('No', 290, 254); R.cursor(284, 236 + this.idx * 28);
    }
  }
})();

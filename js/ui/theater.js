// The Theater (title screen; not in the PS1 game): the story's cutscenes to watch again, in story order. A scene
// unlocks once the story has reached it in your own game (watched or skipped; never in the Demo), or when one of
// your save files is past it (its story flag); until then it shows as ????. The unlocks are kept per browser
// (localStorage ff7js_theater), for every save file.
(function () {
  const R = FF7.render, I = FF7.input, U = FF7.util;
  const KEY = 'ff7js_theater';
  // [movie id, name, disc, the story flag a save has once it is past the scene ('*': any save at all)]
  const LIST = [
    ['opening', 'Midgar, City of Mako', 1, '*'],
    ['reactor1_blast', 'Reactor No. 1 Explodes', 1, 'c1_escape'],
    ['midgar_train', 'The Midnight Train', 1, 'c2_departed'],
    ['plate_fall', 'The Sector 7 Plate Falls', 1, 'c3_plate_fallen'],
    ['shinra_motors_ad', 'A Shinra Motors Advert', 1, 'c4_bike'],
    ['shinra_escape', 'Escape from Shinra HQ', 1, 'c4_bike'],
    ['leave_midgar', 'Leaving Midgar', 1, 'left_midgar'],
    ['nibel_fire', 'Nibelheim in Flames', 1, 'c5a_fb_library2'],
    ['junon_ship', 'Arrival at Costa del Sol', 1, 'c5b_arrived'],
    ['gold_saucer', 'The Gold Saucer', 1, 'c6a_saw_saucer'],
    ['seto', 'Seto', 1, 'c6b_seto'],
    ['bronco_escape', 'The Tiny Bronco', 1, 'c7_palmer_done'],
    ['temple_shrink', 'The Temple Shrinks', 1, 'c8_temple_done'],
    ['aeris_death', 'At the Altar', 1, 'aeris_dead'],
    ['aeris_lake', 'The Lake', 1, 'aeris_dead'],
    ['black_materia', 'The Black Materia', 2, 'black_materia'],
    ['weapons_awaken', 'The WEAPONs Awaken', 2, 'black_materia'],
    ['meteor', 'Meteor', 2, 'c9_escort'],
    ['sapphire_weapon', 'Sapphire WEAPON', 2, 'c9_gas_stopped'],
    ['highwind_escape', 'Escape from Junon', 2, 'c9_escaped'],
    ['ultimate_weapon', 'Ultimate WEAPON', 2, 'c10_mideel_quake'],
    ['lifestream_fall', 'Into the Lifestream', 2, 'c10_mideel_quake'],
    ['rocket_launch', 'Shinra No. 26 Launches', 2, 'c10_launched'],
    ['rocket_meteor', 'Against Meteor', 2, 'huge_materia_done'],
    ['pod_splashdown', 'The Escape Pod Comes Home', 2, 'huge_materia_done'],
    ['diamond_weapon', 'Diamond WEAPON', 2, 'c11a_diamond_alert'],
    ['sister_ray', 'The Sister Ray Fires', 2, 'c11a_diamond_done'],
    ['highwind_night', 'The Night Before', 3, 'c11b_field_done'],
    ['bizarro_rises', 'Bizarro·Sephiroth', 3, 'c11b_safer_done'],
    ['safer_rises', 'Safer·Sephiroth', 3, 'c11b_safer_done'],
    ['safer_falls', 'The End of Safer·Sephiroth', 3, 'c11b_escape_done'],
    ['highwind_crater_escape', 'Out of the Crater', 3, 'c11b_escape_done'],
    ['holy', 'Holy', 3, 'c11b_kalm_done'],
    ['ending', 'Five Hundred Years Later', 3, 'game_cleared'],
  ];
  const T = FF7.theater = { LIST };
  T.seen = function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  // the story reached a scene (js/field/script.js movie(), js/scenes/ending.js); the Demo's scenes don't count
  T.mark = function (id) {
    if (!LIST.some(e => e[0] === id) || (FF7.runner && FF7.runner.active)) return;
    const s = T.seen(); if (s[id]) return;
    s[id] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* the saves still unlock it */ }
  };
  // the scenes your save files are past (the 15 files and the Autosave; the Demo's own file doesn't count). The
  // story is one road, so a file past a scene has seen every scene before it too
  T.fromSaves = function () {
    const out = {}, keys = [];
    let far = -1;
    for (let i = 0; i < FF7.save.SLOTS; i++) keys.push(i);
    keys.push('auto');
    for (const k of keys) {
      let d = null; try { const raw = localStorage.getItem('ff7js_save_' + k); d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
      if (!d || !d.state || (d.summary && d.summary.demo)) continue;
      const fl = d.state.flags || {};
      LIST.forEach(([, , , flag], i) => { if (flag === '*' || fl[flag]) far = Math.max(far, i); });
    }
    for (let i = 0; i <= far; i++) out[LIST[i][0]] = 1;
    return out;
  };
  T.unlocked = function () { const a = T.seen(), b = T.fromSaves(), out = {}; LIST.forEach(([id]) => { if (a[id] || b[id]) out[id] = true; }); return out; };

  // ---------------------------------------------------------------- the screen
  const ROWS = 12, ROW_H = 26, TOP = 96;
  class Theater {
    constructor() { this.noClock = true; this.t = 0; this.idx = 0; this.top = 0; this.open = T.unlocked(); this.playing = null; }
    enter() { FF7.input.consume(); }
    resume() { FF7.sceneMgr.fadeIn(12); this.open = T.unlocked(); }
    count() { return LIST.filter(([id]) => this.open[id]).length; }
    update(canInput) {
      this.t++;
      if (this.playing && !this.playing.done) return;
      this.playing = null;
      if (!canInput) return;
      const n = LIST.length;
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('left')) { this.idx = Math.max(0, this.idx - ROWS); FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { this.idx = Math.min(n - 1, this.idx + ROWS); FF7.audio.sfx('cursor'); }
      if (this.idx < this.top) this.top = this.idx;
      if (this.idx >= this.top + ROWS) this.top = this.idx - ROWS + 1;
      if (I.back()) { FF7.audio.sfx('cancel'); FF7.sceneMgr.pop(); return; }
      if (I.pressed('ok')) {
        const [id] = LIST[this.idx];
        if (!this.open[id] || !FF7.cinema) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        this.playing = FF7.cinema.play(id, { text: FF7.cinema.sample ? FF7.cinema.sample(id) : '' });
      }
    }
    render() {
      const c = R.ctx;
      c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * U.hash(i, 3)})`; c.fillRect(U.hash(i, 1) * FF7.W, U.hash(i, 2) * FF7.H, 1.5, 1.5); }
      R.window(20, 16, FF7.W - 40, 56);
      R.text('Theater', 40, 26, { size: 22 });
      R.text(`Scenes seen  ${this.count()} / ${LIST.length}`, FF7.W - 40, 32, { size: 15, align: 'right', color: R.COL.cyan });
      R.window(20, 80, FF7.W - 40, ROWS * ROW_H + 30);
      let disc = 0;
      for (let r = 0; r < ROWS; r++) {
        const i = this.top + r; if (i >= LIST.length) break;
        const [id, name, d] = LIST[i], y = TOP + r * ROW_H, on = !!this.open[id];
        R.text(String(i + 1).padStart(2, '0'), 64, y, { size: 15, color: R.COL.gray });
        R.text(on ? name : '????', 100, y, { size: 17, color: on ? (i === this.idx ? R.COL.white : '#d8dce8') : '#6a6e7c' });
        if (d !== disc || r === 0) R.text('Disc ' + d, FF7.W - 44, y + 2, { size: 13, align: 'right', color: R.COL.gray });
        disc = d;
        if (i === this.idx) R.cursor(58, y + 10);
      }
      if (this.top > 0) R.text('▲', FF7.W / 2, 82, { size: 12, align: 'center', color: R.COL.gray });
      if (this.top + ROWS < LIST.length) R.text('▼', FF7.W / 2, 80 + ROWS * ROW_H + 14, { size: 12, align: 'center', color: R.COL.gray });
      const cur = LIST[this.idx];
      R.text(this.open[cur[0]] ? `${I.label('ok')}: watch     ${I.label('cancel')}: back` : `Not seen yet: the story unlocks it.     ${I.label('cancel')}: back`, FF7.W / 2, FF7.H - 30, { size: 14, align: 'center', color: R.COL.gray });
    }
  }
  FF7.scenes.Theater = Theater;
})();

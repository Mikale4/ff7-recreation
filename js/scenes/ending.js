// Ending: the staff roll, then THE END and back to the title (the save carries a clear flag).
// As in FF7 the story (C11b) plays the staff roll after Holy and the Lifestream and before "500 years later"
// (FF7.scenes.staffRoll), then calls FF7.scenes.ending for THE END; reached any other way (debug, skipped
// scenes), FF7.scenes.ending plays the ending movie and the staff roll itself.
(function () {
  const R = FF7.render, I = FF7.input, U = FF7.util;

  // ------------------------------------------------------------------ the roll's contents
  // Our own words: the cast, the places, the adversaries and the soundtrack are read from the game's data; the
  // original game's key staff; this recreation; the player's journey.
  const PARTY = [
    ['cloud', 'Ex-SOLDIER, mercenary'], ['barret', 'Leader of AVALANCHE'], ['tifa', 'Owner of 7th Heaven'],
    ['aeris', 'Flower girl from the slums, last of the Cetra'], ['redxiii', 'Nanaki, guardian of Cosmo Canyon'],
    ['yuffie', 'Materia hunter from Wutai'], ['caitsith', 'Fortune-teller of the Gold Saucer'],
    ['vincent', 'Former Turk'], ['cid', 'Pilot of Shinra No. 26'],
  ];
  const SUPPORT = [
    ['sephiroth', 'Sephiroth', 'The legendary SOLDIER'], ['zack', 'Zack', 'SOLDIER, First Class'],
    ['biggs', 'Biggs', 'AVALANCHE'], ['wedge', 'Wedge', 'AVALANCHE'], ['jessie', 'Jessie', 'AVALANCHE'],
    ['president', 'President Shinra', 'Shinra, Inc.'], ['rufus', 'Rufus', 'Shinra, Inc.'],
    ['heidegger', 'Heidegger', 'Head of Public Safety'], ['scarlet', 'Scarlet', 'Head of Weapons Development'],
    ['hojo', 'Hojo', 'Head of the Science Department'], ['reeve', 'Reeve', 'Head of Urban Development'],
    ['tseng', 'Tseng', 'The Turks'], ['reno', 'Reno', 'The Turks'], ['rude', 'Rude', 'The Turks'], ['elena', 'Elena', 'The Turks'],
  ];
  const STAFF = [
    ['Producer', 'Hironobu Sakaguchi'], ['Director', 'Yoshinori Kitase'], ['Main Programmer', 'Ken Narita'],
    ['Character Design', 'Tetsuya Nomura'], ['Art Director', 'Yusuke Naora'], ['Scenario', 'Kazushige Nojima · Yoshinori Kitase'],
    ['Battle Director', 'Hiroyuki Ito'], ['Music', 'Nobuo Uematsu'],
  ];
  // rows: { t: 'title' | 'head' | 'pair' | 'line' | 'cols' | 'cast' | 'gap', h } (h: its height in px)
  function buildRoll() {
    const st = FF7.state, rows = [], D = FF7.data;
    const gap = (h) => rows.push({ t: 'gap', h });
    const head = (text) => { gap(70); rows.push({ t: 'head', text, h: 56 }); };
    const cols = (list) => { for (let i = 0; i < list.length; i += 2) rows.push({ t: 'cols', a: list[i], b: list[i + 1] || null, h: 30 }); };
    gap(40);
    rows.push({ t: 'title', text: 'FINAL FANTASY VII', h: 90 });
    // the cast: the party (the ones who joined, by the names they were given), then the people of the story
    head('THE CAST');
    PARTY.forEach(([id, role]) => { if (!st.members || st.members.includes(id) || ['cloud', 'barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'cid'].includes(id)) rows.push({ t: 'cast', id, name: (st.chars[id] && st.chars[id].name) || U.names('{' + id.toUpperCase() + '}'), role, h: 84 }); });
    gap(20);
    SUPPORT.forEach(([id, name, role]) => rows.push({ t: 'cast', id, name, role, h: 72, small: true }));
    // the places the journey spans, and how many screens each one is
    head('THE WORLD');
    const areas = {};
    for (const id in FF7.maps) { const a = FF7.maps[id].area; if (a && a !== '?' && a !== 'World' && !FF7.maps[id].dev) areas[a] = (areas[a] || 0) + 1; }
    cols(Object.entries(areas).sort((p, q) => q[1] - p[1]).map(([a, n]) => [a, n + (n === 1 ? ' screen' : ' screens')]));
    // the adversaries (every boss, once)
    head('ADVERSARIES');
    const seen = new Set(), bosses = [];
    for (const id in D.enemies) { const e = D.enemies[id]; if (e && e.boss && e.name && !seen.has(e.name)) { seen.add(e.name); bosses.push([e.name, null]); } }
    cols(bosses);
    // the soundtrack
    head('MUSIC');
    rows.push({ t: 'pair', role: 'Composed by', name: 'Nobuo Uematsu', h: 60 }); gap(14);
    const tracks = Object.values((FF7.AUDIO_MAP && FF7.AUDIO_MAP.music) || {}).map(f => /^(\d+)-(.*)\.mp3$/.exec(f)).filter(Boolean)
      .sort((p, q) => +p[1] - +q[1]).map(m => [m[2], null]);
    cols(tracks);
    // the original game
    head('FINAL FANTASY VII  (1997)');
    STAFF.forEach(([role, name]) => rows.push({ t: 'pair', role, name, h: 60 }));
    rows.push({ t: 'line', text: '© 1997 Square', h: 40, color: R.COL.gray });
    // this recreation, by the numbers
    head('THIS RECREATION');
    const n = (o) => Object.keys(o || {}).length;
    const films = FF7.cinema && FF7.cinema.list ? FF7.cinema.list.length : 0, games = FF7.minigames && FF7.minigames.list ? FF7.minigames.list.length : 0;
    [[n(FF7.maps), 'field screens'], [n(D.enemies), 'enemies'], [n(D.items), 'items'], [n(D.materia), 'kinds of materia'], [films, 'real-time cinematics'], [games, 'minigames']]
      .forEach(([k, what]) => { if (k) rows.push({ t: 'line', text: `${k}  ${what}`, h: 32 }); });
    gap(24);
    ['A non-commercial study project.', 'Dialogue is paraphrased; every model is built from simple shapes, in code.', 'Not affiliated with Square Enix.']
      .forEach(text => rows.push({ t: 'line', text, h: 30, color: R.COL.gray, size: 15 }));
    // the player's own journey
    head('YOUR JOURNEY');
    const lead = st.chars && st.chars.cloud;
    [['Play time', U.fmtTime(st.time || 0)], ['Battles fought', U.fmtNum(st.battles || 0)], ['Gil', U.fmtNum(st.gil || 0)],
      lead ? [lead.name, 'Level ' + lead.level] : null,
      FF7.theater ? ['Scenes seen', `${Object.keys(FF7.theater.unlocked()).length} / ${FF7.theater.LIST.length}`] : null]
      .filter(Boolean).forEach(([role, name]) => rows.push({ t: 'pair', role, name, h: 60 }));
    gap(160);
    rows.push({ t: 'title', text: 'Thank you for playing', h: 70, size: 26 });
    let y = 0; rows.forEach(r => { r.y = y; y += r.h; });
    return { rows, height: y };
  }

  // ------------------------------------------------------------------ the staff roll
  // Scrolls through the whole Staff Roll track (paced to end with it); OK held runs it faster, Start skips.
  const TRACK_SEC = 400;
  class Credits {
    constructor(done) {
      this.t = 0; this.noClock = true; this.isEnding = true; this.done = done; this.finished = false;
      const r = buildRoll(); this.rows = r.rows; this.height = r.height;
      this.y = FF7.H + 10;
      this.speed = (this.height + FF7.H + 10) / (TRACK_SEC * 60);
      this.stars = Array.from({ length: 70 }, (_, i) => ({ x: U.hash(i, 1, 3) * FF7.W, y: U.hash(i, 2, 5) * FF7.H, s: 0.2 + U.hash(i, 3, 7) * 0.6 }));
    }
    enter() { FF7.audio.play('staffroll', { loop: false }); }
    update(canInput) {
      this.t++;
      const v = I.held('ok') ? this.speed * 5 : this.speed;
      this.y -= v;
      this.stars.forEach(s => { s.y -= v * s.s * 0.35; if (s.y < -2) s.y += FF7.H + 4; });
      if (!this.finished && (this.y < -this.height - 20 || (canInput && I.pressed('start') && this.t > 120))) {
        this.finished = true;
        const S = FF7.sceneMgr, self = this;
        S.run((function* () { yield S.fadeOut(90); FF7.audio.stop(60); self.done(); })());
      }
    }
    render() {
      const c = R.ctx, W = FF7.W, H = FF7.H, cx = W / 2;
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(160,200,255,0.5)';
      this.stars.forEach(s => c.fillRect(s.x, s.y, s.s > 0.6 ? 2 : 1, s.s > 0.6 ? 2 : 1));
      for (const r of this.rows) {
        const y = this.y + r.y;
        if (y + r.h < -20 || y > H + 20) continue;
        const fade = Math.min(1, Math.min(y + r.h, H - y) / 60);   // soft in at the bottom, out at the top
        c.save(); c.globalAlpha = Math.max(0, fade);
        if (r.t === 'title') R.text(r.text, cx, y + r.h / 2, { align: 'center', size: r.size || 34 });
        else if (r.t === 'head') R.text(r.text, cx, y + 28, { align: 'center', size: 20, color: R.COL.cyan });
        else if (r.t === 'pair') { R.text(r.role, cx, y + 16, { align: 'center', size: 13, color: R.COL.cyan }); R.text(r.name, cx, y + 38, { align: 'center', size: 19 }); }
        else if (r.t === 'line') R.text(r.text, cx, y + r.h / 2, { align: 'center', size: r.size || 17, color: r.color });
        else if (r.t === 'cols') {
          [[r.a, cx - 150], [r.b, cx + 150]].forEach(([e, x]) => {
            if (!e) return;
            if (e[1]) { R.text(e[0], x - 120, y + 15, { size: 15 }); R.text(e[1], x + 120, y + 15, { size: 13, align: 'right', color: R.COL.gray }); }
            else R.text(e[0], x, y + 15, { size: 15, align: 'center' });
          });
        } else if (r.t === 'cast') {
          const img = R.portrait(r.id), sz = r.small ? 52 : 64, px = cx - 170;
          if (img && img.complete && img.naturalWidth) c.drawImage(img, px, y + (r.h - sz) / 2, sz, sz * img.naturalHeight / img.naturalWidth);
          R.text(r.name, px + sz + 22, y + r.h / 2 - 10, { size: r.small ? 17 : 20 });
          R.text(r.role, px + sz + 22, y + r.h / 2 + 14, { size: 13, color: R.COL.cyan });
        }
        c.restore();
      }
    }
  }

  class TheEnd {
    constructor() { this.t = 0; this.noClock = true; this.isEnding = true; }
    update(canInput) {
      this.t++;
      if (this.t > 180 && canInput && (I.pressed('ok') || I.pressed('start')) && !this._co) {
        const S = FF7.sceneMgr;
        this._co = S.run((function* () { yield S.fadeOut(60); S.set(new FF7.scenes.Title()); yield S.fadeIn(30); })());
      }
    }
    render() {
      const c = R.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      c.save(); c.globalAlpha = Math.min(1, this.t / 120);
      FF7.drawLogo ? FF7.drawLogo(c, FF7.W / 2, 200, this.t, 1) : null;
      R.text('THE END', FF7.W / 2, 320, { align: 'center', size: 22 });
      c.restore();
    }
  }

  // The staff roll over the current scene (the story: after Holy and the Lifestream); a waitable. It ends black.
  FF7.scenes.staffRoll = function () {
    const S = FF7.sceneMgr, w = { done: false };
    FF7.state.flags.c11b_credits = true;
    FF7.state.flags.game_cleared = true;   // (the game is beaten once the staff roll starts; the Demo's route ends here)
    S.push(new Credits(() => { S.pop(); w.done = true; }));
    S.fadeIn(30);
    return w;
  };

  FF7.scenes.ending = function () {
    const S = FF7.sceneMgr, st = FF7.state;
    st.flags.game_cleared = true;
    if (FF7.theater) FF7.theater.mark('ending');
    st.timer = null;
    S.run((function* () {
      yield S.fadeOut(60);
      const holder = { update() {}, render() { R.ctx.fillStyle = '#000'; R.ctx.fillRect(0, 0, FF7.W, FF7.H); }, noClock: true, isEnding: true };
      S.set(holder);
      yield S.fadeIn(1);
      // the story (C11b) stages Holy, the Lifestream, the staff roll and '500 years later' itself; the movie and
      // the roll only play here when the ending is reached some other way (debug / skipped scenes)
      if (!st.flags.c11b_end && FF7.cinema && FF7.cinema.play) yield FF7.cinema.play('ending', {});
      if (!st.flags.c11b_credits) {
        const fin = { done: false };
        S.set(new Credits(() => { fin.done = true; }));
        yield S.fadeIn(30);
        yield fin;
      }
      S.set(new TheEnd());
      yield S.fadeIn(60);
    })());
  };
  FF7.scenes.buildStaffRoll = buildRoll;   // (tools / tests)
})();

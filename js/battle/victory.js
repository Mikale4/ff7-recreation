// Victory: rewards (EXP / AP / Gil / items), level-ups, materia growth, limit learning.
// The rewards are worked out and applied when the battle is won; the results screens then play them
// out as in FF7: the EXP / AP totals count down to 0 while each member's EXP counts up and the bar
// fills (LEVEL UP! mid-count), then the Gil counts down into the party's total beside the items won.
// OK while a count runs finishes it at once; OK again turns the page.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, B = FF7.battle, D = FF7.data;

  // Frames a count of n takes: a steady pace, about 1-1.5 s for an ordinary battle, 2.5 s at most (bosses)
  const countFrames = (n) => n > 0 ? Math.round(U.clamp(40 + 24 * Math.log10(n), 40, 150)) : 0;
  const counter = (n) => ({ n, dur: countFrames(n), f: 0 });
  const prog = (c) => c.dur ? Math.min(1, c.f / c.dur) : 1;
  const left = (c) => c.n - Math.floor(c.n * prog(c));
  // delay: frames the page shows before its numbers start to roll; gate: frames before a press counts
  const PAGE = { exp: { delay: 24, gate: 20 }, gil: { delay: 10, gate: 10 }, notices: { delay: 0, gate: 10 } };

  class Victory {
    constructor(b) {
      this.b = b;
      this.page = 0; this.t = 0;
      const st = FF7.state;
      const beaten = b.enemies.filter(e => (e.dead || e.dying || e.hp <= 0) && !e.fled && !e.removed);
      let exp = 0, ap = 0, gil = 0;
      beaten.forEach(e => { exp += e.exp || 0; ap += e.ap || 0; gil += e.gil || 0; });
      gil += beaten.reduce((s, e) => s + (e.vars.stolenGil || 0), 0);
      this.exp = exp; this.ap = ap;
      // gil plus
      const gp = Math.max(0, ...b.party.map(p => p.char ? FF7.sys.materia.indepTotal(p.char, 'gil_plus') : 0));
      this.gil = gp ? gil * 2 : gil;
      // item drops (one per enemy max, FF7-like)
      this.items = [];
      beaten.forEach(e => {
        for (const d of e.drops || []) { if (U.chance(d.chance != null ? d.chance : 12)) { this.items.push(d.item); break; } }
        (e.vars.stolenItems || []).forEach(i => this.items.push(i));
      });
      b.morphed.forEach(i => this.items.push(i));
      // quest drops: FF7.questDrops, fns (enemy, items won so far) -> an item id or null (Cait Sith's spare parts)
      (FF7.questDrops || []).forEach(fn => beaten.forEach(e => { try { const id = fn(e, this.items); if (id) this.items.push(id); } catch (err) { console.error(err); } }));
      this.items.forEach(i => FF7.sys.inv.add(i, 1));
      this.gil0 = st.gil;                  // the party's Gil before / after, for the count
      FF7.sys.inv.addGil(this.gil);
      this.gil1 = st.gil;
      // EXP to everyone (party full if alive, reserves half)
      this.rows = [];
      const notices = [];
      st.members.forEach(id => {
        const c = st.chars[id]; if (!c || FF7.isGuest(id)) return;
        const cb = b.party.find(p => p.id === id);
        const inParty = !!cb;
        if (inParty && cb.dead) { this.rows.push({ c, lv: 0, dead: true, xp0: c.xp, lv0: c.level, xp1: c.xp, lv1: c.level }); return; }
        let e = inParty ? exp : Math.floor(exp / 2);
        const xpPlus = FF7.sys.materia.indepLevels(c, 'exp_plus');
        if (xpPlus.length) e = Math.floor(e * (Math.max(...xpPlus) >= 2 ? 2 : 1.5));
        const before = c.level, xp0 = c.xp;
        FF7.sys.stats.gainXp(c, e);
        if (inParty) this.rows.push({ c, lv: c.level - before, xp0, lv0: before, xp1: c.xp, lv1: c.level });
        if (c.level > before) notices.push(`${c.name} reached level ${c.level}!`);
        // AP only for active, living members
        if (inParty && ap) {
          const evs = FF7.sys.materia.gainAp(c, ap);
          evs.forEach(ev => {
            const md = D.materia[ev.materia.id];
            notices.push(ev.mastered ? `${md ? md.name : ev.materia.id} mastered!` + (ev.born ? ' A new materia was born!' : '') : `${md ? md.name : ev.materia.id} level up! (Lv ${ev.level})`);
          });
        }
      });
      // limit learning (kills / uses)
      b.party.forEach(p => { if (p.char) Victory.checkLimits(p.char).forEach(n => notices.push(`${p.char.name} learned "${n}"!`)); });
      b.learnedEskills.forEach(e => notices.push(`Learned enemy skill "${(D.eskills[e.id] || {}).name || e.id}"!`));
      this.notices = notices;
      FF7.audio.play('victory', { restart: true });
      b.musicPushed = true;
      this.pages = ['exp', 'gil'].concat(notices.length ? ['notices'] : []);
      // the screens show the rewards counting in from the values before the battle (party order, as in FF7)
      const slot = (r) => b.party.findIndex(p => p.id === r.c.id);
      this.rows.sort((a, z) => slot(a) - slot(z));
      this.rows.forEach(r => { r.shownXp = r.xp0; r.shownLv = r.lv0; r.lvUpT = -99; });
      this.lvSfxT = -99;
      this.cExp = counter(exp); this.cAp = counter(ap); this.cGil = counter(this.gil);
      this.enterPage();
    }
    enterPage() {
      this.curPage = this.page; this.pt = 0; this.idleT = 0;
      const pg = this.pages[this.page];
      const p = PAGE[pg] || PAGE.notices;
      this.delay = p.delay; this.gate = p.gate;
      this.counters = pg === 'exp' ? [this.cExp, this.cAp] : pg === 'gil' ? [this.cGil] : [];
    }
    get counting() { return this.counters.some(c => c.f < c.dur); }
    // a press is taken (it finishes a running count, or turns the page)
    canInput() { return this.pt >= this.gate; }
    // the shown EXP / level of each member follows the EXP count (a level passed mid-count: LEVEL UP!)
    sync() {
      const ST = FF7.sys.stats, k = prog(this.cExp);
      let up = false;
      this.rows.forEach(r => {
        if (r.dead) return;
        const xp = k >= 1 ? r.xp1 : r.xp0 + Math.floor((r.xp1 - r.xp0) * k);
        let lv = r.shownLv;
        while (lv < r.lv1 && xp >= ST.xpFor(r.c.id, lv + 1)) lv++;
        if (k >= 1) lv = r.lv1;
        if (lv > r.shownLv) { r.lvUpT = this.t; up = true; }
        r.shownXp = xp; r.shownLv = lv;
      });
      if (up && this.t - this.lvSfxT >= 10) { this.lvSfxT = this.t; FF7.audio.sfx('levelup'); }   // (a boss's EXP passes many levels: one chime per 10 frames)
    }
    update(canInput) {
      this.t++;
      if (this.curPage !== this.page) this.enterPage();     // (tools/sim.js turns the pages itself)
      this.pt++;
      if (this.counting) {
        if (this.pt > this.delay) {
          this.counters.forEach(c => { if (c.f < c.dur) c.f++; });
          if (this.counters.includes(this.cExp)) this.sync();
        }
      } else this.idleT++;               // frames since the page's counts finished (the Demo's beat)
      if (!canInput || !this.canInput()) return;
      if (I.pressed('ok') || I.pressed('cancel')) {
        if (this.counting) {             // FF7: OK finishes the count at once
          this.counters.forEach(c => { c.f = c.dur; });
          if (this.counters.includes(this.cExp)) this.sync();
          return;
        }
        FF7.audio.sfx('cursor');
        this.page++;
        if (this.page >= this.pages.length) this.b.finish('win');
        else this.enterPage();
      }
    }
    render() {
      const pg = this.pages[this.page];
      if (!pg) return;
      R.fill('#000010', 0.35);
      if (pg === 'exp') this.renderExp();
      else if (pg === 'gil') this.renderGil();
      else if (pg === 'notices') {
        // (26 px a line, centred, with the same space above the first as below the last)
        R.window(20, 60, 600, this.notices.length * 26 + 20);
        this.notices.forEach((n, i) => R.textMid(n, 40, 83 + i * 26, { size: 16 }));
      }
    }
    // EXP / AP totals across the top, a window per party member: portrait, name, level, EXP, next level, bar
    renderExp() {
      const ST = FF7.sys.stats, lab = { size: 14, color: R.COL.cyan };
      R.window(20, 60, 290, 42); R.textMid('EXP', 36, 81, { color: R.COL.cyan }); R.textMid(U.fmtNum(left(this.cExp)) + 'p', 290, 81, { align: 'right' });
      R.window(330, 60, 290, 42); R.textMid('AP', 346, 81, { color: R.COL.cyan }); R.textMid(U.fmtNum(left(this.cAp)) + 'p', 600, 81, { align: 'right' });
      this.rows.forEach((r, i) => {
        const y = 116 + i * 96, c = r.c, lv = r.shownLv, xp = r.shownXp;
        R.window(20, y, 600, 88);
        const img = R.portrait(c.id);
        if (img) R.img(img, 32, y + 10, 68, 68, { alpha: r.dead ? 0.5 : 1 });
        R.text(c.name, 116, y + 12, { color: r.dead ? R.COL.red : R.COL.white });
        R.text('LV', 116, y + 46, lab); R.text(String(lv), 178, y + 44, { align: 'right' });
        if (r.dead) R.text('(KO)', 196, y + 44, { color: R.COL.red });
        else if (lv > r.lv0 && (this.t - r.lvUpT < 30 || FF7.frame % 40 < 30)) R.text('LEVEL UP!', 192, y + 44, { color: R.COL.yellow });
        const base = ST.xpFor(c.id, lv), nextAt = lv >= 99 ? xp : ST.xpFor(c.id, lv + 1);
        R.text('EXP', 300, y + 14, lab); R.text(U.fmtNum(xp) + 'p', 590, y + 12, { align: 'right' });
        R.text('next level', 300, y + 38, lab); R.text(U.fmtNum(Math.max(0, nextAt - xp)) + 'p', 590, y + 36, { align: 'right' });
        R.bar(300, y + 64, 290, 8, nextAt > base ? (xp - base) / (nextAt - base) : 1, '#40a0ff', '#a0e0ff');
      });
    }
    // Gil won counting down into the party's total, and the items won (with the menus' icons)
    renderGil() {
      const k = prog(this.cGil), UI = FF7.ui;
      R.window(20, 60, 600, 42); R.textMid('Gil', 36, 81, { color: R.COL.cyan }); R.textMid(U.fmtNum(left(this.cGil)) + ' gil', 600, 81, { align: 'right' });
      R.window(20, 110, 600, 42); R.textMid('Total', 36, 131, { color: R.COL.cyan }); R.textMid(U.fmtNum(this.gil0 + Math.floor((this.gil1 - this.gil0) * k)) + ' gil', 600, 131, { align: 'right' });
      const n = this.items.length, two = n > 8, lines = two ? Math.ceil(n / 2) : Math.max(1, n);
      // (a 26 px line for the title and each row of items, centred, the same space above and below)
      R.window(20, 170, 600, (lines + 1) * 26 + 20);
      R.textMid('Items', 36, 193, { color: R.COL.cyan });
      if (!n) R.textMid('Nothing', 60, 219, { color: R.COL.gray });
      this.items.forEach((it, i) => {
        const x = two && i >= lines ? 330 : 60, cy = 219 + (i % lines) * 26;
        if (UI && UI.itemIcon) UI.itemIcon(R.ctx, x, cy - 8, UI.iconKind(it));
        R.textMid(U.itemName(it), x + 22, cy);
      });
    }
  }
  // Returns list of newly learned limit names for a character (FF7 rules from limits.js `learn`)
  Victory.checkLimits = function (c) {
    const out = [];
    const L = D.limits;
    let changed = true, guard = 0;
    while (changed && guard++ < 10) {
      changed = false;
      for (const id in L) {
        const l = L[id];
        if (l.char !== c.id || c.limitsKnown.includes(id)) continue;
        const rule = l.learn || '';
        let ok = false;
        if (rule === 'start') ok = true;
        else if (rule.startsWith('uses:')) { const [, lid, n] = rule.split(':'); ok = (c.limitUses[lid] || 0) >= +n; }
        else if (rule.startsWith('kills:')) { ok = (c.kills || 0) >= +rule.split(':')[1]; }
        if (ok) { c.limitsKnown.push(id); out.push(l.name); changed = true; }
      }
    }
    return out;
  };
  B.Victory = Victory;
})();

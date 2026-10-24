// Kupomon menus (docs/KUPOMON.md): the in-game menu (Moogles, Kupodex, Bag, Save, Switch off), the evolution scene
// and the move picker (four moves out of a pool: evolution's old-and-new, and breeding's two parents').
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, U = FF7.util, R = FF7.render, MG = FF7.minigames, GL = FF7.GL;
  const W = FF7.W, H = FF7.H, PI = Math.PI;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const D = () => FF7.state.kp;
  const fmtTime = (t) => Math.floor(t / 3600) + ':' + U.pad(Math.floor(t / 60) % 60, 2);
  const typeChip = (t, x, y, w = 80, h = 16) => KP.typeBadge(t, x, y, w, h);   // (js/kupomon/kp_ui.js)

  // ------------------------------------------------------------------ the bag's pockets (Pokémon's: one kind of thing each,
  // always in the same order, so nothing is ever far down a long list): left / right between them
  KP.BAG_POCKETS = [
    { id: 'repairs', name: 'Repairs', kinds: ['heal', 'revive', 'cure'], col: '#2f8a5a' },
    { id: 'nuts', name: 'Kupo Nuts', kinds: ['nut'], col: '#a8742e' },
    { id: 'held', name: 'Held Items', kinds: ['held'], col: '#4a62b8' },
    { id: 'chips', name: 'Skill Chips', kinds: ['chip'], col: '#8c46b0' },
    { id: 'key', name: 'Key Items', kinds: ['key'], col: '#b0862a' },
  ];
  // a pocket's items in the bag, in the game's own item order (the Skill Chips by number)
  KP.pocketItems = (i, bag) => { const P = KP.BAG_POCKETS[i], b = bag || D().bag; return P ? Object.keys(KP.ITEMS).filter(k => P.kinds.includes(KP.ITEMS[k].kind) && b[k] > 0) : []; };
  KP.pocketOf = (id) => KP.BAG_POCKETS.findIndex(P => KP.ITEMS[id] && P.kinds.includes(KP.ITEMS[id].kind));
  // a list's first row shown, keeping the cursor in view (rows: how many fit)
  KP.listTop = (sel, n, rows) => Math.max(0, Math.min(sel - Math.floor(rows / 2), n - rows));
  // a long list in pages instead (the bag's pockets, the held items to give: the user, 2026-10-02, "pagified, so it's
  // more manageable"): a page is as many rows as show; L1 / R1 flip a page, up / down run on across them
  KP.pageOf = (sel, rows) => Math.floor(Math.max(0, sel) / Math.max(1, rows));
  KP.pageFlip = (sel, n, rows, dir) => {   // the same row on the next / previous page (the last item if that page is short)
    const pages = Math.max(1, Math.ceil(n / rows)); if (pages < 2) return sel;
    const pg = (KP.pageOf(sel, rows) + dir + pages) % pages;
    return Math.min(n - 1, pg * rows + (sel % rows));
  };
  const pageKeys = () => { const I = FF7.input; return I && I.label ? `${I.label('l1')} / ${I.label('r1')}` : 'L1 / R1'; };
  // the pocket tabs along the top of a bag window, and its list (a scroll bar when it runs on); y: the tabs' top
  KP.drawPockets = function (pockets, cur, x, y, w) {
    const tw = w / pockets.length;
    pockets.forEach((p, i) => {
      const P = KP.BAG_POCKETS[p], tx = x + i * tw, on = i === cur;
      R.ctx.fillStyle = on ? P.col : 'rgba(255,255,255,0.07)'; R.ctx.fillRect(tx + 2, y, tw - 4, 24);
      if (on) { R.ctx.fillStyle = 'rgba(255,255,255,0.35)'; R.ctx.fillRect(tx + 2, y, tw - 4, 2); }
      R.textFit(P.name, tx + tw / 2, y + 5, tw - 12, { size: 13, minSize: 9, align: 'center', color: on ? R.COL.white : R.COL.gray });
    });
  };
  KP.drawScroll = function (x, y, h, top, rows, n) {
    if (n <= rows) return;
    R.ctx.fillStyle = 'rgba(255,255,255,0.12)'; R.ctx.fillRect(x, y, 4, h);
    R.ctx.fillStyle = '#c8d8ff'; R.ctx.fillRect(x, y + h * top / n, 4, Math.max(8, h * rows / n));
  };
  // one row of the bag: the item (a Skill Chip: its number, move and the move's type), and how many
  KP.drawBagRow = function (id, x, y, w, count) {
    const it = KP.ITEMS[id];
    if (it.kind === 'chip') {
      const mv = KP.MOVES[it.move] || {}, num = id.replace('chip_', '');
      if (mv.type) KP.typeGem(mv.type, x + 7, y + 9, 7);
      R.text('No.' + num, x + 20, y + 1, { size: 13, color: R.COL.gray });
      R.textFit(mv.name || it.name, x + 70, y, w - 76, { size: 15, minSize: 11 });
      return;
    }
    R.textFit(it.name, x, y, w - 56, { size: 15, minSize: 11 });
    if (it.kind !== 'key') R.text('x' + count, x + w, y, { size: 14, align: 'right' });
  };

  // ------------------------------------------------------------------ the menu
  KP.openMenu = () => S().push(new Menu());
  class Menu {
    constructor() { this.idx = 0; this.mode = 'main'; this.sub = 0; this.msg = null; this.t = 0; this.ask = null; this.transparent = true; }
    items() { return ['MOOGLES', 'KUPODEX', 'BAG', 'BADGES', 'SAVE', 'SWITCH OFF']; }
    update() {
      const I = FF7.input; this.t++;
      if (this.chipCo) { const c = this.chipCo; c.co.update(); if (c.co.done) { this.chipCo = null; if (c.lines.length) this.msg = { text: c.lines[c.lines.length - 1] }; } return; }
      if (this.msg) { if (I.pressed('ok') || I.back()) { const m = this.msg; this.msg = null; if (m.then) m.then(); } return; }
      if (this.ask) return this.updateAsk(I);
      if (this.mode === 'main') {
        const L = this.items();
        if (I.repeat('up')) { this.idx = (this.idx + L.length - 1) % L.length; sfx('cursor'); }
        if (I.repeat('down')) { this.idx = (this.idx + 1) % L.length; sfx('cursor'); }
        if (I.back() || I.pressed('menu')) { sfx('cancel'); S().pop(); return; }
        if (I.pressed('ok')) {
          sfx('confirm');
          const k = this.idx;
          if (k === 0) { if (!D().party.length) { this.msg = { text: "You don't have any moogles yet!" }; return; } this.mode = 'party'; this.sub = 0; this.pick = null; }
          else if (k === 1) { this.mode = 'dex'; this.sub = 0; }
          else if (k === 2) { this.mode = 'bag'; this.pocket = this.pocket || 0; this.bagPos = this.bagPos || {}; this.sub = Math.min(this.bagPos[this.pocket] || 0, Math.max(0, KP.pocketItems(this.pocket).length - 1)); }
          else if (k === 3) { this.mode = 'badges'; }
          else if (k === 4 && KP._demoRun && KP.saveDemo) this.ask = { q: 'Save to which file?', opts: ['Demo File', 'File 1', 'File 2', 'Cancel'], idx: 0, then: (i) => {
            // a Demo's game (Title > Demo): its own Demo file (KP.saveDemo), or Files 1-2 for a player who took over
            if (i === 0) { const ok = KP.saveDemoNow ? KP.saveDemoNow() : KP.saveDemo(null, null); sfx(ok ? 'save' : 'error'); this.msg = { text: ok ? 'Saved to the Demo file.' : 'The Demo file could not be saved.' }; return; }
            if (i < 3) { KP.save(i - 1); sfx('save'); this.msg = { text: `Saved to File ${i}.` }; }
          } };
          else if (k === 4) this.ask = { q: 'Save to which file?', opts: ['File 1', 'File 2', 'Cancel'], idx: KP.slot || 0, then: (i) => { if (i < 2) { KP.save(i); sfx('save'); const auto = FF7.qol && FF7.qol.on && FF7.qol.on('autosave'); this.msg = { text: auto ? `Saved to File ${i + 1}. (Your FF7 Autosave holds it too.)` : `Saved to File ${i + 1}. (It's kept in your FF7 save file: save that too!)` }; } } };
          else if (k === 5) this.ask = { q: 'Switch off the MogBoy? Anything not saved is lost.', opts: ['Save to File ' + ((KP.slot || 0) + 1) + ' and switch off', 'Switch off', 'Cancel'], idx: 0, then: (i) => { if (i === 2) return; if (i === 0) KP.save(KP.slot || 0); S().pop(); KP.quit(); } };
        }
        return;
      }
      if (this.mode === 'party') return this.updateParty(I);
      if (this.mode === 'summary') { if (I.back() || I.pressed('ok')) { sfx('cancel'); this.mode = 'party'; } if (I.repeat('up') || I.repeat('down')) { const n = D().party.length; this.sub = (this.sub + (I.repeat('up') ? n - 1 : 1)) % n; sfx('cursor'); } return; }
      if (this.mode === 'dex') {
        const n = KP.DEX.length;
        if (I.repeat('up')) { this.sub = (this.sub + n - 1) % n; sfx('cursor'); }
        if (I.repeat('down')) { this.sub = (this.sub + 1) % n; sfx('cursor'); }
        if (I.repeat('left')) { this.sub = Math.max(0, this.sub - 13); sfx('cursor'); }   // (a page at a time: the Kupodex is long)
        if (I.repeat('right')) { this.sub = Math.min(n - 1, this.sub + 13); sfx('cursor'); }
        if (I.back()) { sfx('cancel'); this.mode = 'main'; }
        else if (I.pressed('ok')) { if (D().dex.seen[KP.DEX[this.sub]]) { sfx('confirm'); this.mode = 'entry'; } else sfx('error'); }
        return;
      }
      if (this.mode === 'entry') {   // an entry: up / down to the next one seen
        const seen = KP.DEX.map((id, i) => i).filter(i => D().dex.seen[KP.DEX[i]]), k = seen.indexOf(this.sub), n = seen.length;
        if (I.repeat('up')) { this.sub = seen[(k + n - 1) % n]; sfx('cursor'); }
        if (I.repeat('down')) { this.sub = seen[(k + 1) % n]; sfx('cursor'); }
        // (the entry's pages: the entry, the moves it learns and its abilities, the Skill Chips it can learn: left / right)
        const pages = this.entryPages(KP.DEX[this.sub]);
        if ((I.repeat('left') || I.repeat('right')) && D().dex.caught[KP.DEX[this.sub]] && pages.length > 1) { const i = Math.max(0, pages.indexOf(this.entryPage || 0)); this.entryPage = pages[(i + (I.repeat('right') ? 1 : pages.length - 1)) % pages.length]; sfx('cursor'); }
        if (I.back() || I.pressed('ok')) { sfx('cancel'); this.mode = 'dex'; this.entryPage = 0; }
        return;
      }
      if (this.mode === 'bag') return this.updateBag(I);
      if (this.mode === 'badges') { if (I.back() || I.pressed('ok')) { sfx('cancel'); this.mode = 'main'; } return; }
    }
    updateAsk(I) {
      const a = this.ask;
      const fl = I.repeat('l1') ? -1 : I.repeat('r1') ? 1 : 0;   // (a long list: a page back / on, drawAsk's 10 rows)
      if (fl && a.opts.length > 10) { a.idx = KP.pageFlip(a.idx, a.opts.length, 10, fl); sfx('cursor'); return; }
      if (I.repeat('up')) { a.idx = (a.idx + a.opts.length - 1) % a.opts.length; sfx('cursor'); }
      if (I.repeat('down')) { a.idx = (a.idx + 1) % a.opts.length; sfx('cursor'); }
      if (I.back()) { sfx('cancel'); this.ask = null; return; }
      if (I.pressed('ok')) { sfx('confirm'); this.ask = null; a.then(a.idx); }
    }
    // the team: OK on a moogle for what to do with it; a swap picks a second moogle
    updateParty(I) {
      const P = D().party, n = P.length;
      if (I.repeat('up')) { this.sub = (this.sub + n - 1) % n; sfx('cursor'); }
      if (I.repeat('down')) { this.sub = (this.sub + 1) % n; sfx('cursor'); }
      if (I.back()) { sfx('cancel'); if (this.pick != null) this.pick = null; else this.mode = 'main'; return; }
      if (!I.pressed('ok')) return;
      if (this.pick != null) { sfx('confirm'); const a = P[this.pick]; P[this.pick] = P[this.sub]; P[this.sub] = a; this.pick = null; return; }
      sfx('confirm');
      const mon = P[this.sub];
      const heldOpts = KP.pocketItems(KP.BAG_POCKETS.findIndex(P => P.id === 'held'));
      this.ask = { q: `${KP.name(mon)} (${KP.jobName(mon)})`, opts: ['Summary', 'Swap', mon.held ? 'Take ' + KP.ITEMS[mon.held].name : 'Give an item', 'Cancel'], idx: 0, then: (i) => {
        if (i === 0) this.mode = 'summary';
        else if (i === 1) this.pick = this.sub;
        else if (i === 2) {
          if (mon.held) { KP.give(mon.held); this.msg = { text: `Took the ${KP.ITEMS[mon.held].name} from ${KP.name(mon)}.` }; mon.held = null; }
          else if (!heldOpts.length) this.msg = { text: "You don't have anything to hold." };
          else this.ask = { q: `Give ${KP.name(mon)} what?`, opts: heldOpts.map(k => KP.ITEMS[k].name).concat(['Cancel']), idx: 0, then: (j) => { if (j >= heldOpts.length) return; KP.take(heldOpts[j]); mon.held = heldOpts[j]; this.msg = { text: `${KP.name(mon)} is now holding the ${KP.ITEMS[mon.held].name}.` }; } };
        }
      } };
    }
    // a Skill Chip from the bag: which moogle (those that can learn it marked), then the forget-a-move choice at four
    useChip(id) {
      const it = KP.ITEMS[id], mv = KP.MOVES[it.move], P = D().party; if (!mv || !P.length) return;
      const fits = (m) => KP.chipFits ? KP.chipFits(m, id) : false;
      this.ask = { q: `Teach ${mv.name} to which moogle?`, opts: P.map(m => `${KP.name(m)}  ${m.moves.includes(it.move) ? '(knows it)' : fits(m) ? 'ABLE' : 'unable'}`).concat(['Cancel']), idx: 0, then: (j) => {
        if (j >= P.length) return;
        const m = P[j];
        if (m.moves.includes(it.move)) { sfx('error'); this.msg = { text: `${KP.name(m)} already knows ${mv.name}.` }; return; }
        if (!fits(m)) { sfx('error'); this.msg = { text: `${KP.name(m)} can't learn ${mv.name}.` }; return; }
        // the learning runs as a little script of its own (the picker opens over the menu)
        const lines = [], say = function* (t) { lines.push(t); };
        const co = new FF7.Coroutine(KP.learnMove(say, m, it.move), { name: 'kp-chip' });
        this.chipCo = { co, lines };
      } };
    }
    // the bag: its pockets (left / right), field use of the repairs on a moogle, a Skill Chip taught
    updateBag(I) {
      const np = KP.BAG_POCKETS.length, dp = I.repeat('left') ? -1 : I.repeat('right') ? 1 : 0;
      if (dp) {   // (each pocket keeps its own place)
        this.bagPos = this.bagPos || {}; this.bagPos[this.pocket] = this.sub;
        this.pocket = (this.pocket + np + dp) % np;
        this.sub = Math.min(this.bagPos[this.pocket] || 0, Math.max(0, KP.pocketItems(this.pocket).length - 1)); sfx('cursor'); return;
      }
      const L = KP.pocketItems(this.pocket), n = Math.max(1, L.length);
      const fl = I.repeat('l1') ? -1 : I.repeat('r1') ? 1 : 0;   // (a page back / on: drawBag's rows)
      if (fl && L.length > (this.bagRows || 11)) { this.sub = KP.pageFlip(this.sub, L.length, this.bagRows || 11, fl); sfx('cursor'); return; }
      if (I.repeat('up')) { this.sub = (this.sub + n - 1) % n; sfx('cursor'); }
      if (I.repeat('down')) { this.sub = (this.sub + 1) % n; sfx('cursor'); }
      if (I.back()) { sfx('cancel'); this.bagPos = this.bagPos || {}; this.bagPos[this.pocket] = this.sub; this.mode = 'main'; return; }
      if (!I.pressed('ok') || !L.length) return;
      const id = L[this.sub], it = KP.ITEMS[id];
      if (it.kind === 'chip') return this.useChip(id);
      if (it.kind === 'key') return KP.useKeyItem ? KP.useKeyItem(this, id) : null;   // (Big Mog's Bell: js/kupomon/kp_fly.js)
      if (it.kind === 'ability') {   // (a Kupo Capsule or Patch: on which moogle, kp_traits.js)
        const P = D().party; if (!P.length) return;
        this.ask = { q: `Use the ${it.name} on which moogle?`, opts: P.map(m => `${KP.name(m)}  (${(KP.abilityOf(m) || {}).name || 'no ability'})`).concat(['Cancel']), idx: 0, then: (j) => {
          if (j >= P.length) return;
          const u = KP.useAbilityItem(id, P[j]); sfx(u.ok ? 'levelup' : 'error'); this.msg = { text: u.text };
          if (this.sub >= KP.pocketItems(this.pocket).length) this.sub = Math.max(0, KP.pocketItems(this.pocket).length - 1);
        } };
        return;
      }
      if (it.kind === 'repel') {   // (a Pom Spray: on the lead's pom-pom at once, kp_repel.js)
        const u = KP.useRepel(id); sfx(u.ok ? 'heal' : 'error'); this.msg = { text: u.text };
        if (this.sub >= KP.pocketItems(this.pocket).length) this.sub = Math.max(0, KP.pocketItems(this.pocket).length - 1);
        return;
      }
      if (!['heal', 'revive', 'cure'].includes(it.kind)) { sfx('error'); this.msg = { text: it.kind === 'held' ? 'Give it to a moogle to hold (Moogles menu).' : "That's for battle." }; return; }
      const P = D().party; if (!P.length) return;
      this.ask = { q: `Use the ${it.name} on which moogle?`, opts: P.map(m => `${KP.name(m)}  ${m.hp}/${KP.maxHp(m)}`).concat(['Cancel']), idx: 0, then: (j) => {
        if (j >= P.length) return;
        const m = P[j], max = KP.maxHp(m);
        if (it.kind === 'heal' && m.hp > 0 && m.hp < max) { KP.take(id); const b = m.hp; m.hp = Math.min(max, m.hp + it.heal); sfx('heal'); this.msg = { text: `${KP.name(m)} recovered ${m.hp - b} HP.` }; }
        else if (it.kind === 'revive' && m.hp <= 0) { KP.take(id); m.hp = Math.max(1, Math.floor(max * it.heal)); sfx('heal'); this.msg = { text: `${KP.name(m)} powered back up!` }; }
        else if (it.kind === 'cure' && m.status) { KP.take(id); m.status = null; sfx('heal'); this.msg = { text: `${KP.name(m)} is all better.` }; }
        else { sfx('error'); this.msg = { text: "It won't have any effect." }; }
        if (this.sub >= KP.pocketItems(this.pocket).length) this.sub = Math.max(0, KP.pocketItems(this.pocket).length - 1);
      } };
    }

    render() {
      // the field shows behind a dark veil
      R.fill('#000', 0.55);
      const d = D(), L = this.items();
      // (the margins even above and below the letters: the font's caps start 1.4 below a 16-size line's top and end 12.4
      // below it, so 30 a row and 12 more puts 15 over the first and 15.6 under the last; it was 15 over, 34 under: the
      // user, 2026-10-04)
      R.window(W - 190, 12, 178, 12 + L.length * 30);
      L.forEach((t, i) => R.text(t, W - 160, 26 + i * 30, { size: 16, color: this.mode === 'main' || i === this.idx ? R.COL.white : R.COL.gray }));
      R.cursor(W - 176, 37 + this.idx * 30);
      const dex = KP.dexCount();
      const sy = 30 + L.length * 30;   // (the status box, six under the commands)
      const hard = KP.hard && KP.hard();   // (Hard Mode: its level cap, breeding permits and the fallen)
      R.window(W - 190, sy, 178, hard ? 174 : 119);   // (even margins: 12.6 over the name's letters and under the last line's; it was 6 under)
      R.text(FF7.state.chars.cloud.name, W - 176, sy + 12, { size: 15 });
      if (hard) {
        const cap = KP.levelCap();
        R.text('HARD MODE', W - 176, sy + 116, { size: 12, color: '#ff9a7a' });
        R.text(`Level cap  ${cap >= KP.MAX_LEVEL ? 'none' : 'Lv ' + cap}`, W - 176, sy + 134, { size: 12, color: R.COL.gray });
        R.text(`Permits ${Math.max(0, KP.breedPermits())}   Fallen ${(d.fallen || []).length}`, W - 176, sy + 152, { size: 12, color: R.COL.gray });
      }
      R.text(`Coins  ${d.money}`, W - 176, sy + 36, { size: 13 });
      R.text(`Badges  ${d.badges.length} / ${KP.BADGES.length - 1}`, W - 176, sy + 56, { size: 13 });
      R.text(`Kupodex  ${dex.caught} / ${dex.of}`, W - 176, sy + 76, { size: 13 });
      R.text(`Time  ${fmtTime(FF7.state.time || 0)}`, W - 176, sy + 96, { size: 13, color: R.COL.gray });
      if (this.mode === 'party' || this.mode === 'summary') this.drawParty();
      if (this.mode === 'summary') this.drawSummary(d.party[this.sub]);
      if (this.mode === 'dex') this.drawDex();
      if (this.mode === 'entry') this.drawEntry();
      if (this.mode === 'bag') this.drawBag();
      if (this.mode === 'badges') this.drawBadges();
      if (this.ask) this.drawAsk();
      if (this.msg) { R.window(20, H - 90, W - 40, 72); R.para(this.msg.text, 36, H - 78, W - 72, { size: 15, minSize: 12, lines: 3 }); }
    }
    drawAsk() {
      const a = this.ask, rows = Math.min(a.opts.length, 10), pages = Math.ceil(a.opts.length / rows), pg = KP.pageOf(a.idx, rows), top = pg * rows, h = 46 + rows * 28 + (pages > 1 ? 18 : 0);
      R.window(40, H - 30 - h, 360, h);
      R.text(a.q, 56, H - 18 - h, { size: 14, color: R.COL.cyan });
      a.opts.slice(top, top + rows).forEach((o, i) => R.textFit(o, 80, H - 18 - h + 28 + i * 28, 300, { size: 15, minSize: 11 }));
      R.cursor(64, H - 7 - h + 28 + (a.idx - top) * 28);
      if (pages > 1) {   // (in pages: which one, and the keys to flip)
        R.text(`Page ${pg + 1} / ${pages}`, 56, H - 18 - h + 28 + rows * 28, { size: 11 });
        R.text(`${pageKeys()}: pages`, 388, H - 18 - h + 28 + rows * 28, { size: 11, align: 'right', color: R.COL.gray });
      }
    }
    drawParty() {
      const P = D().party;
      R.window(12, 12, W - 214, 40 + KP.PARTY_MAX * 62);
      R.text(this.pick != null ? 'Swap with which moogle?' : 'Moogles', 28, 22, { size: 15, color: R.COL.cyan });
      // each a tiny picture of its own 3D model, as the old games' party icons (js/kupomon/kp_box.js: a couple made a
      // frame); the one under the cursor hops, its model drawn live
      let made = 0;
      for (const m of P) { if (made >= 2) break; if (KP.moogleIconFull && !KP.moogleIconFull(m.sp)) { KP.moogleIconFull(m.sp, true); made++; } }   // (the whole moogle, framed to its size)
      const tx = 92;
      P.forEach((m, i) => {
        const y = 50 + i * 62, max = KP.maxHp(m), sp = KP.sp(m);
        if (this.pick === i) { R.ctx.fillStyle = 'rgba(255,255,255,0.12)'; R.ctx.fillRect(20, y - 4, W - 230, 56); }
        if (i === this.sub && this.mode === 'party' && KP.drawMoogleLiveFull) KP.drawMoogleLiveFull(m, 40, y - 4, 46, { hop: Math.abs(Math.sin(this.t * 0.12)) });
        else if (KP.drawMoogleIconFull) KP.drawMoogleIconFull(m, 40, y - 4, 46);
        R.textFit(KP.name(m), tx, y, 246 - tx, { size: 16, minSize: 12 });
        R.textFit(`${KP.jobName(m)}   Lv ${m.lv}${m.plus ? '   +' + m.plus : ''}`, tx, y + 20, 246 - tx, { size: 12, minSize: 10, color: R.COL.gray });
        typeChip(sp.type, 250, y + 2); if (sp.type2) typeChip(sp.type2, 250, y + 20);
        R.bar(336, y + 6, 70, 6, Math.max(0, m.hp / max), '#40d060', '#40d060');
        R.text(`${m.hp}/${max}`, 336, y + 18, { size: 12 });
        if (m.status) KP.statusBadge(m.status, 380, y + 34, 38, 15);
        if (m.held) R.textFit('◆ ' + KP.ITEMS[m.held].name, tx, y + 36, 372 - tx, { size: 11, minSize: 9, color: '#e8c060' });
      });
      if (!this.ask) R.cursor(36, 61 + this.sub * 62);
    }
    drawSummary(m) {
      if (!m) return;
      const sp = KP.sp(m), max = KP.maxHp(m);
      R.window(20, 40, W - 230, H - 80);
      R.text(`${KP.name(m)} — ${KP.jobName(m)}`, 40, 54, { size: 18 });
      R.text(`Lv ${m.lv}   EXP ${m.exp} (next ${m.lv >= KP.MAX_LEVEL ? '—' : KP.expAt(m, m.lv + 1) - m.exp})${m.plus ? '   Bred +' + m.plus : ''}`, 40, 80, { size: 13, color: R.COL.gray });
      typeChip(sp.type, 40, 104, 88, 17); if (sp.type2) typeChip(sp.type2, 134, 104, 88, 17);
      // its appetite (Pokémon's nature): the stat it raises and the one it lowers
      const app = KP.appetiteOf ? KP.appetiteOf(m) : null;
      if (app) R.textFit(`${app.name}${app.plus ? `  +${KP.STAT_SHORT[app.plus]} -${KP.STAT_SHORT[app.minus]}` : '  (balanced)'}`, 232, 105, W - 260 - 232, { size: 13, minSize: 10, color: '#e8d0a0' });
      (KP.STATS || ['hp', 'atk', 'def', 'spd']).forEach((k, i) => {
        const col = app && app.plus === k ? '#ff9078' : app && app.minus === k ? '#80b8ff' : R.COL.white;
        R.text(`${KP.STAT_LABEL ? KP.STAT_LABEL[k] : k}  ${k === 'hp' ? m.hp + '/' + max : KP.stat(m, k)}`, 40 + (i % 2) * 190, 128 + Math.floor(i / 2) * 20, { size: 14, color: col });
      });
      // its ability (one of its kind's: KP.abilityOf) and what it does; the held item beside it
      const ab = KP.abilityOf ? KP.abilityOf(m) : null;
      R.text('Ability', 40, 192, { size: 11, color: R.COL.cyan });
      R.textFit(ab ? ab.name : 'none', 92, 190, 140, { size: 14, minSize: 11, color: '#a0d8ff' });
      R.textFit('Held: ' + (m.held ? KP.ITEMS[m.held].name : 'nothing'), 240, 192, W - 260 - 240, { size: 13, minSize: 10, color: '#e8c060' });
      if (ab) R.para(ab.desc || '', 40, 208, W - 290, { size: 11, minSize: 9, lines: 1, color: R.COL.gray });
      m.moves.forEach((id, i) => {
        const mv = KP.MOVES[id]; if (!mv) return; const y = 228 + i * 41;
        KP.typeGem(mv.type, 43, y + 10, 8);
        R.text(mv.name, 54, y, { size: 15 });
        R.text(`${KP.CATEGORY_LABEL ? KP.CATEGORY_LABEL[KP.category(mv)] : ''}${mv.power ? '  ' + mv.power : ''}   Acc ${mv.acc === true ? '—' : mv.acc}   CD ${mv.cd || 'none'}`, 200, y + 2, { size: 12, color: R.COL.gray });
        R.para(mv.desc || '', 54, y + 20, W - 300, { size: 11, minSize: 9, lines: 1, color: R.COL.gray });
      });
      R.para(sp.desc || '', 40, H - 86, W - 290, { size: 13, minSize: 11, lines: 2 });
    }
    drawDex() {
      const d = D(), n = KP.DEX.length, top = Math.max(0, Math.min(this.sub - 6, n - 13));
      R.window(12, 12, 300, H - 24);
      R.text('KUPODEX', 28, 22, { size: 15, color: R.COL.cyan });
      for (let i = top; i < Math.min(n, top + 13); i++) {
        const id = KP.DEX[i], sp = KP.SPECIES[id], y = 50 + (i - top) * 32, seen = d.dex.seen[id], got = d.dex.caught[id];
        R.text(U.pad(i + 1, n > 999 ? 4 : 3, '0'), 36, y, { size: 13, color: R.COL.gray });
        R.text(seen ? `${sp.moogle} — ${KP.JOBS[sp.job].name}` : '?????', 84, y, { size: 13, color: seen ? R.COL.white : R.COL.gray });
        if (got) KP.pomIcon(290, y + 7, 5);
      }
      R.cursor(28, 61 + (this.sub - top) * 32);
      // the one under the cursor (below the status box)
      const id = KP.DEX[this.sub], sp = KP.SPECIES[id], x = 320, w = W - 332;
      R.window(x, 314, w, H - 326);
      if (!d.dex.seen[id]) { R.text('Not seen yet.', x + 16, 328, { size: 14, color: R.COL.gray }); return; }
      R.textFit(`${sp.moogle} — ${KP.JOBS[sp.job].name}`, x + 16, 326, w - 32, { size: 15, minSize: 12 });
      typeChip(sp.type, x + 16, 349); if (sp.type2) typeChip(sp.type2, x + 102, 349);
      if (d.dex.caught[id]) R.para(sp.desc || '', x + 16, 374, w - 32, { size: 12, minSize: 10, lines: 4 });
      else R.text('(Befriend one to learn more.)', x + 16, 374, { size: 12, color: R.COL.gray });
      R.text('Confirm: open the entry   ◀ ▶ a page', x + w - 16, H - 34, { size: 11, align: 'right', color: R.COL.gray });
    }
    // a Kupodex entry: the moogle itself, turning, on the left; its job line, where it's found, and (once befriended)
    // its base stats, moves and the full entry
    drawEntry() {
      const d = D(), id = KP.DEX[this.sub], sp = KP.SPECIES[id], got = !!d.dex.caught[id], seenSp = (k) => d.dex.seen[k];
      R.window(12, 12, W - 24, H - 24);
      // the model
      if (!this.entry || this.entry.id !== id) { const m = KP.moogleModel(id); m.scale = 1.15; if (m.anims && m.anims.idle) m.play(m.anims.idle); this.entry = { id, m }; }
      R.ctx.fillStyle = 'rgba(0,0,20,0.35)'; R.ctx.fillRect(28, 44, 240, 280);
      if (!this.cam) this.cam = new MG.Cam();
      this.cam.set([0.86, 0.95, 3.3], [0.86, 0.32, 0], 40, 0.1, 50);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.95, 0.93, 0.9], ambient: [0.5, 0.5, 0.58] } });
      this.cam.apply();
      MG.shadow(0, 0, 0, 0.4, 0.4);
      MG.drawModel(this.entry.m, [0, 0, 0], this.t * 0.015, 0, 0, got ? null : { tint: [0.25, 0.25, 0.32, 1] });
      GL.end();
      // the name, job and types
      const x = 288, w = W - 28 - x;
      R.text('No. ' + U.pad(this.sub + 1, KP.DEX.length > 999 ? 4 : 3, '0'), x, 24, { size: 13, color: R.COL.gray });
      // its class: a legend, a mythical, a breeding-only kind (and how rare)
      const only = KP.breedOnly ? KP.breedOnly() : new Map(), cls = sp.class === 'mythical' ? ['Mythical', '#e070d0'] : (sp.rate || 120) <= 5 ? ['Legendary', '#f0c040'] : only.has(id) ? [only.get(id) ? `Bred: ${KP.BREED_TIER[only.get(id)]}` : 'Breeding only', '#60c0a0'] : null;
      if (cls) KP.tag(cls[0], x + 76, 23, cls[1], 15);
      R.text(got ? 'Befriended' : 'Seen', W - 28, 24, { size: 13, align: 'right', color: got ? '#ff7a90' : R.COL.gray }); if (got) KP.pomIcon(W - 108, 31, 5);
      R.textFit(sp.moogle, x, 42, w, { size: 24, minSize: 16 });
      R.text(KP.JOBS[sp.job].name + ' moogle', x, 72, { size: 14, color: R.COL.gray });
      typeChip(sp.type, x, 95, 98, 20); if (sp.type2) typeChip(sp.type2, x + 104, 95, 98, 20);
      // its job line, from the first job (each later one with the level it changes at)
      let first = id; for (let k = 0; k < 4; k++) { const pre = KP.DEX.find(q => (KP.SPECIES[q].evo || {}).to === first); if (!pre) break; first = pre; }
      const line = []; for (let q = first, at = null; q; ) { line.push((seenSp(q) ? KP.JOBS[KP.SPECIES[q].job].name : '?????') + (at ? ` (Lv ${at})` : '')); const e = KP.SPECIES[q].evo; at = e && e.at; q = e && e.to; }
      R.text('JOB LINE', x, 122, { size: 11, color: R.COL.cyan });
      R.para(line.length > 1 ? line.join('  ▸  ') : 'Does not change jobs.', x, 138, w, { size: 13, minSize: 11, lines: 2 });
      // where it's found: the routes whose grass it's in; a starter; or by a change of job
      const where = Object.values(FF7.maps).filter(m => KP.wildTablesOf(m).some(t => KP.WILD[t].some(r => r[0] === id))).map(m => m.name);   // (a zone's table too: Whisperwood Deep's glade)
      const pre = KP.DEX.find(q => (KP.SPECIES[q].evo || {}).to === id);
      const bred = (KP.BREED_RECIPES || []).some(r => r.child === id) || KP.BREED.some(([, , q]) => q === id);
      const found = where.length ? where.join(', ') : KP.STARTERS.includes(id) ? "Prof. Sith's lab (a starter)" : pre ? `Changes job from ${seenSp(pre) ? KP.JOBS[KP.SPECIES[pre].job].name : '?????'}` : sp.found ? sp.found : bred ? 'Bred at the Kupo Ranch' : 'Unknown';
      R.text('FOUND', x, 176, { size: 11, color: R.COL.cyan });
      R.para(found, x, 192, w, { size: 13, minSize: 11, lines: 2 });
      if (!got) { R.text('(Befriend one to learn more.)', x, 236, { size: 13, color: R.COL.gray }); return; }
      // base stats
      R.text('BASE STATS', x, 230, { size: 11, color: R.COL.cyan });
      const B = sp.base, KS = KP.STATS || ['hp', 'atk', 'def', 'spd'], total = KS.reduce((a, k) => a + (B[k] || 0), 0);
      KS.forEach((k, i) => {
        const y = 244 + i * 13;
        R.text(KP.STAT_LABEL ? KP.STAT_LABEL[k] : k, x, y - 1, { size: 11 }); R.text(String(B[k] || 0), x + 92, y - 1, { size: 11, align: 'right' });
        R.bar(x + 102, y + 4, w - 102, 5, Math.min(1, (B[k] || 0) / 150), '#40c0f0', '#80e0ff');
      });
      R.text(`Total  ${total}`, x, 322, { size: 11, color: R.COL.gray });
      // its own moves (a befriended one may know others: breeding, keeping old moves)
      R.text('MOVES', 28, 334, { size: 11, color: R.COL.cyan });
      sp.moves.forEach((mid, i) => {
        // (two columns inside the picture's width: a long name shrinks rather than run into the abilities)
        const colW = Math.floor((x - 12 - 28) / 2), mv = KP.MOVES[mid]; if (!mv) return; const mx = 28 + (i % 2) * colW, my = 350 + Math.floor(i / 2) * 20;
        KP.typeGem(mv.type, mx + 6, my + 9, 7);
        R.textFit(mv.name, mx + 17, my, colW - 21, { size: 13, minSize: 9 });
      });
      // its kind's abilities (a moogle has one of them; their effects on the second page)
      const abs = ((KP.SPECIES_ABIL && KP.SPECIES_ABIL[id]) || []).map(a => KP.ABILITIES[a]).filter(Boolean);
      R.text(abs.length > 1 ? 'ABILITIES' : 'ABILITY', x, 338, { size: 11, color: R.COL.cyan });
      R.textFit(abs.length ? abs.map(a => a.name).join('  /  ') : 'None', x, 352, w, { size: 13, minSize: 10, color: '#a0d8ff' });
      // the entry
      R.para(sp.desc || '', x, 373, w, { size: 12, minSize: 10, lines: 2 });
      R.window(12, H - 72, W - 24, 60);
      R.para(`Befriending: ${sp.rate >= 150 ? 'easy' : sp.rate >= 100 ? 'fair' : sp.rate >= 60 ? 'hard' : 'very hard'}.   Grows ${{ fast: 'quickly', medium: 'steadily', slow: 'slowly' }[sp.curve] || 'steadily'}.`, 28, H - 58, W - 56, { size: 13, color: R.COL.gray, lines: 2 });
      const pages = this.entryPages(id), pg = this.entryPage || 0, at = Math.max(0, pages.indexOf(pg));
      if (pages.length > 1) this.drawPageMark(at + 1, pages.length, pg === 1 ? 'Left / right: the entry, the Skill Chips' : pg === 2 ? 'Left / right: back to the entry' : pages.includes(1) ? 'Left / right: moves it learns, abilities' : 'Left / right: the Skill Chips it can learn');
      if (pg === 1) this.drawLearnset(id);
      if (pg === 2) this.drawChips(id);
    }
    // which page of an entry this is (bottom right): "Page 1 / 2" between two arrows that pulse, so a second page
    // can't be missed, and what left / right does
    drawPageMark(page, of, hint) {
      const c = R.ctx, cx = W - 96, cy = H - 52, a = 0.55 + 0.45 * Math.sin(this.t * 0.15);
      R.text(`Page ${page} / ${of}`, cx, H - 60, { size: 14, align: 'center', color: R.COL.white });
      c.save(); c.globalAlpha = a; c.fillStyle = '#80e0ff';
      c.beginPath(); c.moveTo(cx - 58, cy); c.lineTo(cx - 48, cy - 7); c.lineTo(cx - 48, cy + 7); c.closePath(); c.fill();   // (left)
      c.beginPath(); c.moveTo(cx + 58, cy); c.lineTo(cx + 48, cy - 7); c.lineTo(cx + 48, cy + 7); c.closePath(); c.fill();   // (right)
      c.restore();
      R.text(hint, W - 28, H - 34, { size: 11, align: 'right', color: R.COL.gray });
    }
    // an entry's pages: 0 the entry, 1 the moves it learns and its abilities (a learnset), 2 the Skill Chips it can learn
    entryPages(id) { const L = [0]; if (KP.LEARN && KP.LEARN[id]) L.push(1); if (this.chipsFor(id).length) L.push(2); return L; }
    chipsFor(id) {
      if (!KP.chipFits) return [];
      const c = this._chips || (this._chips = {}); if (c[id]) return c[id];
      return (c[id] = Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'chip' && KP.MOVES[KP.ITEMS[k].move] && KP.chipFits({ sp: id, moves: [] }, k)).map(k => KP.ITEMS[k].move)
        .filter((m, i, a) => a.indexOf(m) === i).sort((a, b) => KP.MOVES[a].name.localeCompare(KP.MOVES[b].name)));
    }
    // the third page: every Skill Chip it can learn, by name, in as many columns as the page needs (a moogle can take
    // dozens), each with its type's gem
    drawChips(id) {
      const x = 288, w = W - 28 - x, L = this.chipsFor(id);
      R.ctx.fillStyle = '#0c1430'; R.ctx.fillRect(x - 6, 92, w + 12, H - 164);
      R.text(`SKILL CHIPS IT CAN LEARN (${L.length})`, x, 98, { size: 11, color: R.COL.cyan });
      const top = 116, room = H - 100 - top, cols = L.length > 36 ? 3 : 2, per = Math.max(1, Math.ceil(L.length / cols));
      const rowH = Math.max(11, Math.min(20, Math.floor(room / per))), colW = w / cols, size = rowH < 14 ? 10 : rowH < 17 ? 11 : 12;
      L.forEach((m, i) => {
        const mv = KP.MOVES[m], cx = x + Math.floor(i / per) * colW, y = top + (i % per) * rowH;
        KP.typeGem(mv.type, cx + 6, y + rowH / 2 - 2, rowH < 14 ? 4.5 : 6);
        R.textFit(mv.name, cx + 15, y - 1, colW - 18, { size, minSize: 8 });
      });
      R.text('Sold at the Marts, or found about the isles. Teach them from the bag.', x, H - 92, { size: 10, color: R.COL.gray });
    }
    // an entry's second page: the moves it learns by level (each once) and its abilities (the Skill Chips: page three)
    drawLearnset(id) {
      const sp = KP.SPECIES[id], x = 288, w = W - 28 - x;
      // (over page 1's column below its name and job, which stay; its last line too)
      R.ctx.fillStyle = '#0c1430'; R.ctx.fillRect(x - 6, 92, w + 12, H - 164);
      R.text('LEARNS', x, 98, { size: 11, color: R.COL.cyan });
      const seen = new Set(), rows = [];
      for (const [lv, m] of KP.LEARN[id] || []) { if (seen.has(m) || !KP.MOVES[m]) continue; seen.add(m); rows.push([lv, m]); }
      const per = Math.ceil(rows.length / 2);
      const ab = (KP.SPECIES_ABIL && KP.SPECIES_ABIL[id]) || [];
      // (a long learnset packs its rows closer, so the abilities and the chip count stay above the window below)
      const rowH = Math.max(12, Math.min(20, Math.floor((H - 80 - 116 - (ab.length ? 16 + 26 * ab.length : 0) - 26) / Math.max(1, per))));
      rows.forEach(([lv, m], i) => {
        const mv = KP.MOVES[m], cx = x + (i >= per ? w / 2 : 0), y = 116 + (i % per) * rowH;
        R.text(lv <= 1 ? '—' : 'Lv ' + lv, cx, y, { size: rowH < 16 ? 10 : 11, color: R.COL.gray });
        KP.typeGem(mv.type, cx + 46, y + 7, 6);
        R.textFit(mv.name, cx + 56, y - 1, w / 2 - 60, { size: rowH < 16 ? 11 : 12, minSize: 9 });
      });
      let y = 122 + per * rowH;
      if (ab.length) {
        R.text('ABILITIES', x, y, { size: 11, color: R.COL.cyan }); y += 16;
        ab.forEach(a => { const A = KP.ABILITIES[a]; if (!A) return; R.textFit(A.name, x, y, 104, { size: 12, minSize: 9, color: '#a0d8ff' }); R.para(A.desc || '', x + 110, y, w - 110, { size: 10, minSize: 9, lines: 2, color: R.COL.gray }); y += 26; });
      }
      if (this.chipsFor(id).length) R.text(`Skill Chips it can learn: ${this.chipsFor(id).length} (the next page)`, x, Math.min(y + 4, H - 100), { size: 12, color: '#e8c060' });
    }
    // the badge case and the trophy shelf
    drawBadges() {
      const d = D(), trophies = d.trophies || [];
      R.window(12, 12, W - 214, H - 24);
      R.text('BADGES', 28, 22, { size: 15, color: R.COL.cyan });
      for (let n = 1; n < KP.BADGES.length; n++) {   // (eight: four to a row)
        const B = KP.BADGES[n], got = d.badges.includes(n), col = (n - 1) % 4, row = Math.floor((n - 1) / 4);
        const cx = 70 + col * 102, cy = 84 + row * 108;
        KP.badgeIcon(n, cx, cy, 27, got);
        R.textFit(got ? B.name : '???', cx, cy + 36, 98, { size: 13, minSize: 9, align: 'center', color: got ? R.COL.white : R.COL.gray });
        R.textFit(got ? `${B.master}, ${B.town}` : B.town, cx, cy + 54, 98, { size: 10, minSize: 8, align: 'center', color: R.COL.gray });
      }
      R.text('TROPHIES', 28, 300, { size: 15, color: R.COL.cyan });
      for (let n = 1; n <= 5; n++) {
        const L = KP.LEAGUES && KP.LEAGUES[n], got = trophies.includes(n), cx = 62 + (n - 1) * 84, cy = 360;
        KP.trophyIcon(cx, cy, 22, L ? L.col : '#e8c040', got);
        R.textFit(L ? L.name.replace(' League', '').replace('World Championship', 'World') : '', cx, cy + 32, 80, { size: 11, minSize: 9, align: 'center', color: got ? R.COL.white : R.COL.gray });
      }
    }
    drawBag() {
      const d = D(), P = KP.BAG_POCKETS, L = KP.pocketItems(this.pocket || 0), x = 12, w = W - 214;
      // (the Skill Chips: each move's numbers on the right of its row, as the move picker shows them when a move is
      // learned; under the list the team, who can learn it; the move's panel in the box below)
      const chips = (P[this.pocket || 0] || {}).id === 'chips';
      R.window(x, 12, w, H - 24);
      KP.drawPockets(P.map((p, i) => i), this.pocket || 0, x + 12, 22, w - 24);
      const y0 = 58, rh = 27, rows = this.bagRows = Math.floor((H - 96 - y0 - 18) / rh) - (chips ? 2 : 0);
      const pages = Math.max(1, Math.ceil(L.length / rows)), pg = KP.pageOf(this.sub, rows), top = pg * rows;   // (in pages: L1 / R1)
      if (!L.length) R.text('Nothing in this pocket.', 56, y0 + 4, { size: 15, color: R.COL.gray });
      L.slice(top, top + rows).forEach((k, j) => {
        if (!chips) { KP.drawBagRow(k, 56, y0 + j * rh, w - 76, d.bag[k]); return; }
        KP.drawBagRow(k, 56, y0 + j * rh, w - 76 - 128, d.bag[k]);   // (its number and move, narrower)
        R.text(this.chipStats(KP.MOVES[KP.ITEMS[k].move]), 56 + w - 76, y0 + j * rh + 2, { size: 12, align: 'right', color: R.COL.gray });
      });
      if (chips && L.length) this.drawChipTeam(L[this.sub], x + 16, y0 + rows * rh + 4, w - 32);
      R.text(L.length ? `${this.sub + 1} / ${L.length}` + (pages > 1 ? `      Page ${pg + 1} / ${pages}` : '') : '', x + 24, H - 116, { size: 11, color: pages > 1 ? R.COL.white : R.COL.gray });
      R.text((pages > 1 ? `${pageKeys()}: pages    ` : '') + 'Left / right: pockets', x + w - 16, H - 116, { size: 11, align: 'right', color: R.COL.gray });
      if (pages > 1) for (let i = 0; i < pages && pages <= 24; i++) { R.ctx.fillStyle = i === pg ? '#c8d8ff' : 'rgba(255,255,255,0.18)'; R.ctx.fillRect(x + w - 14, y0 + 4 + i * Math.min(14, (rows * rh - 8) / pages), 5, Math.max(4, Math.min(10, (rows * rh - 8) / pages - 3))); }   // (a dot a page)
      if (!L.length) return;
      R.cursor(36, y0 + 11 + (this.sub - top) * rh); R.window(12, H - 90, W - 214, 78);
      const it = KP.ITEMS[L[this.sub]], mv = chips && KP.MOVES[it.move];
      if (!mv) { R.para(it.desc, 28, H - 78, W - 250, { size: 14, minSize: 11, lines: 3 }); return; }
      // (a chip: the move picker's panel for its move: the type, the numbers, what it does)
      if (mv.type) KP.typeBadge(mv.type, 28, H - 80, 92, 16);
      const nh = R.para(`${KP.CATEGORY_LABEL ? KP.CATEGORY_LABEL[KP.category(mv)] : ''}${mv.power ? '   Power ' + mv.power : ''}   Accuracy ${mv.acc === true ? '—' : mv.acc}   Cooldown ${mv.cd ? mv.cd + ' turn' + (mv.cd > 1 ? 's' : '') : 'none'}${mv.prio ? '   Goes first' : ''}`,
        128, H - 79, W - 214 - 128 - 6, { size: 12, minSize: 10, lines: 2, lineH: 14, color: '#c8d8ff' });
      const dy = H - 80 + Math.max(22, nh + 6);
      R.para(mv.desc || it.desc || 'No description.', 28, dy, W - 250, { size: 12, minSize: 10, lines: nh > 14 ? 2 : 3, lineH: 15 });
    }
    // a Skill Chip's row, on the right: its move's numbers, as the move picker's rows
    chipStats(mv) { return mv ? `${mv.power ? 'Pow ' + mv.power : 'Status'}  Acc ${mv.acc === true ? '—' : mv.acc}  CD ${mv.cd || '-'}` : ''; }
    // under the Skill Chips: the team, each a tiny picture of its model, lit if it can learn the chip's move (Pokémon's
    // TM case: ABLE / NOT ABLE; LEARNED: it knows it)
    drawChipTeam(id, x, y, w) {
      const it = KP.ITEMS[id], P = D().party; if (!it || !P.length) return;
      let made = 0;
      for (const m of P) { if (made >= 2) break; if (KP.moogleIconFull && !KP.moogleIconFull(m.sp)) { KP.moogleIconFull(m.sp, true); made++; } }   // (the whole moogle, framed to its size)
      const cw = Math.min(66, w / P.length);
      P.forEach((m, i) => {
        const knows = m.moves.includes(it.move), able = !knows && !!(KP.chipFits && KP.chipFits(m, id)), cx = x + i * cw + cw / 2;
        if (KP.drawMoogleIconFull) KP.drawMoogleIconFull(m, cx - 15, y, 30, { alpha: able || knows ? 1 : 0.3 });   // (the whole moogle)
        R.text(knows ? 'LEARNED' : able ? 'ABLE' : 'NOT ABLE', cx, y + 31, { size: 9, align: 'center', color: knows ? R.COL.gray : able ? '#80f0a0' : '#d09090' });
      });
    }
  }
  KP.Menu = Menu;

  // ------------------------------------------------------------------ the Mart: the stock and prices, your coins, how many
  // of the highlighted one you have and what it does; then how many to buy (up / down one, left / right ten)
  //   KP.shop(['kupo_nut', ...], { name: 'Mart Mog' }) -> waitable, done when you leave
  // The stock is sorted like the bag (the user, 2026-10-02): the bag's pocket tabs (only the ones this Mart sells),
  // left / right between them, each in the bag's own item order (the Skill Chips by number); the list scrolls, and it
  // stops above the description box, so nothing is ever drawn under it
  KP.shop = function (stock, o = {}) { const w = { done: false }; S().push(new Shop(stock, o, w)); return w; };
  class Shop {
    constructor(stock, o, w) {
      this.stock = stock; this.o = o; this.w = w; this.qty = null; this.t = 0; this.msg = null; this.transparent = true;
      const has = new Set(stock.filter(k => KP.ITEMS[k]));
      this.pockets = []; this.lists = [];   // (the pockets it sells, as KP.BAG_POCKETS indices; their items)
      KP.BAG_POCKETS.forEach((P, i) => {
        const L = Object.keys(KP.ITEMS).filter(k => has.has(k) && P.kinds.includes(KP.ITEMS[k].kind));
        if (L.length) { this.pockets.push(i); this.lists.push(L); }
      });
      this.pocket = 0; this.idx = 0; this.pos = this.lists.map(() => 0);   // (each pocket keeps its own place)
    }
    list() { return this.lists[this.pocket] || []; }
    // (a Skill Chip is reusable: one is all anyone needs)
    most(id) { const d = D(), it = KP.ITEMS[id]; return Math.max(0, Math.min((it.kind === 'chip' ? 1 : 99) - (d.bag[id] || 0), Math.floor(d.money / it.price))); }
    buy(id, n) {
      const d = D(), it = KP.ITEMS[id];
      n = Math.min(n, this.most(id)); if (n <= 0) return false;
      d.money -= it.price * n; KP.give(id, n); sfx('purchase');
      this.msg = { text: `Bought ${n} ${it.name}${n > 1 ? 's' : ''}! Thanks, kupo!`, t: 80 };
      if (it.kind === 'nut' && n >= 10) { const g = Math.floor(n / 10); KP.give('mognet_nut', g); this.msg = { text: `Bought ${n} ${it.name}s! And here's ${g > 1 ? g + ' Mognet Nuts' : 'a Mognet Nut'} on the house, kupo!`, t: 110 }; }
      return true;
    }
    close() { sfx('cancel'); S().pop(); this.w.done = true; }
    update() {
      const I = FF7.input, d = D(), L = this.list(), n = L.length; this.t++;
      if (this.msg) { if (--this.msg.t <= 0 || (this.msg.t < 70 && (I.pressed('ok') || I.back()))) this.msg = null; return; }
      if (this.qty != null) {
        const id = L[this.idx], most = this.most(id), q0 = this.qty;
        if (I.repeat('up')) this.qty = this.qty >= most ? 1 : this.qty + 1;
        if (I.repeat('down')) this.qty = this.qty <= 1 ? most : this.qty - 1;
        if (I.repeat('right')) this.qty = Math.min(most, this.qty + 10);
        if (I.repeat('left')) this.qty = Math.max(1, this.qty - 10);
        if (this.qty !== q0) sfx('cursor');
        if (I.back()) { sfx('cancel'); this.qty = null; }
        else if (I.pressed('ok')) { this.buy(id, this.qty); this.qty = null; }
        return;
      }
      const np = this.pockets.length, dp = I.repeat('left') ? -1 : I.repeat('right') ? 1 : 0;
      if (dp && np > 1) { this.pos[this.pocket] = this.idx; this.pocket = (this.pocket + np + dp) % np; this.idx = this.pos[this.pocket]; sfx('cursor'); return; }
      if (n && I.repeat('up')) { this.idx = (this.idx + n - 1) % n; sfx('cursor'); }
      if (n && I.repeat('down')) { this.idx = (this.idx + 1) % n; sfx('cursor'); }
      if (I.back()) return this.close();
      if (I.pressed('ok') && n) {
        const id = L[this.idx];
        if (KP.ITEMS[id].kind === 'chip' && d.bag[id] > 0) { sfx('error'); this.msg = { text: "You already have that Skill Chip, kupo. It works as many times as you like!", t: 100 }; return; }
        if ((d.bag[id] || 0) >= 99) { sfx('error'); this.msg = { text: "Your bag can't hold any more of those, kupo.", t: 90 }; return; }
        if (d.money < KP.ITEMS[id].price) { sfx('error'); this.msg = { text: "Kupo... you can't afford that one.", t: 90 }; return; }
        sfx('confirm'); this.qty = 1;
      }
    }
    render() {
      const d = D(), L = this.list(), id = L[this.idx], it = id && KP.ITEMS[id];
      // the stock: the pocket tabs, then as many rows as fit above the description box (H - 96), a scroll bar past that
      const x = 20, y = 20, lw = 372, wh = H - 96 - 8 - y, rx = x + 40;
      R.window(x, y, lw, wh);
      R.text(this.o.name || 'Mart', x + 18, y + 10, { size: 15, color: R.COL.cyan });
      KP.drawPockets(this.pockets, this.pocket, x + 12, y + 34, lw - 24);
      const y0 = y + 68, rh = 28, rows = Math.floor((y + wh - 30 - y0) / rh), top = KP.listTop(this.idx, L.length, rows);
      L.slice(top, top + rows).forEach((k, j) => {
        const ry = y0 + j * rh, item = KP.ITEMS[k], can = d.money >= item.price, col = can ? R.COL.white : R.COL.gray, nw = x + lw - 84 - rx;
        if (item.kind === 'chip') {   // (as in the bag: the move's type, the chip's number, the move)
          const mv = KP.MOVES[item.move] || {};
          if (mv.type) KP.typeGem(mv.type, rx + 7, ry + 9, 7);
          R.text('No.' + k.replace('chip_', ''), rx + 20, ry + 1, { size: 13, color: R.COL.gray });
          R.textFit(mv.name || item.name, rx + 70, ry, nw - 70, { size: 15, minSize: 11, color: col });
        } else R.textFit(item.name, rx, ry, nw, { size: 15, minSize: 11, color: col });
        if (item.kind === 'chip' && d.bag[k] > 0) R.text('Owned', x + lw - 22, ry + 1, { size: 13, align: 'right', color: R.COL.gray });
        else R.text(String(item.price), x + lw - 22, ry, { size: 15, align: 'right', color: can ? '#ffe080' : R.COL.gray });
      });
      KP.drawScroll(x + lw - 12, y0, rows * rh, top, rows, L.length);
      if (!L.length) R.text('Nothing for sale here.', rx, y0 + 4, { size: 15, color: R.COL.gray });
      if (this.qty == null && L.length) R.cursor(rx - 20, y0 + 11 + (this.idx - top) * rh);
      const fy = y + wh - 24, I = FF7.input;
      R.text(L.length ? `${this.idx + 1} / ${L.length}` : '', x + 18, fy, { size: 11, color: R.COL.gray });
      R.text((this.pockets.length > 1 ? 'Left / right: pockets   ' : '') + `${I.label ? I.label('cancel') : 'Back'}: leave`, x + lw - 16, fy, { size: 11, align: 'right', color: R.COL.gray });
      // your coins, and how many of that one you have
      R.window(W - 220, 20, 200, 62);
      R.text('Coins', W - 204, 30, { size: 13, color: R.COL.gray });
      R.text(String(d.money), W - 36, 50, { size: 18, align: 'right', color: '#ffe080' });
      if (it) {
        R.window(W - 220, 88, 200, 42);
        R.text('In your bag', W - 204, 100, { size: 13, color: R.COL.gray });
        R.text('\u00d7' + (d.bag[id] || 0), W - 36, 99, { size: 15, align: 'right' });
      }
      // how many
      if (this.qty != null && it) {
        R.window(W - 220, 136, 200, 86);
        R.text('How many?', W - 204, 146, { size: 13, color: R.COL.cyan });
        R.text('\u00d7' + U.pad(this.qty, 2, '0'), W - 150, 170, { size: 22, align: 'center' });
        R.text('\u25b2', W - 150, 160, { size: 9, align: 'center', color: R.COL.gray }); R.text('\u25bc', W - 150, 196, { size: 9, align: 'center', color: R.COL.gray });
        R.text(String(it.price * this.qty), W - 36, 174, { size: 17, align: 'right', color: '#ffe080' });
        R.text('\u2190\u2192 \u00b110', W - 36, 200, { size: 11, align: 'right', color: R.COL.gray });
      }
      // what the highlighted one does (its own box along the bottom: the list above ends before it)
      R.window(0, H - 96, W, 96);
      if (this.msg) R.para(this.msg.text, 22, H - 80, W - 44, { size: 16, lines: 3 });
      else if (it) { R.text(it.name, 22, H - 84, { size: 15, color: R.COL.cyan }); R.para(it.desc || '', 22, H - 60, W - 44, { size: 15, minSize: 12, lines: 2 }); }
      else R.text('Leave the Mart.', 22, H - 80, { size: 15, color: R.COL.gray });
    }
  }
  KP.Shop = Shop;

  // ------------------------------------------------------------------ the move picker: four out of a pool (one at least with
  // no cooldown, so it can always act)
  KP.pickMoves = function (mon, pool, title, pre) {
    const w = { done: false, result: null };
    S().push(new Picker(mon, Array.from(new Set(pool)), title || 'Choose four moves', w, pre));
    return w;
  };
  class Picker {
    constructor(mon, pool, title, w, pre) {
      // (each move once, real ones only: two parents can know the same move)
      this.mon = mon; this.pool = Array.from(new Set(pool)).filter(id => KP.MOVES[id]); this.title = title; this.w = w; this.idx = 0; this.warn = 0;
      pool = this.pool;
      // pre: the four ticked to begin with (learning a move: the ones it knows); else its kind's own
      const base = pre || (KP.movesAt ? KP.movesAt(mon.sp, mon.lv) : (KP.SPECIES[mon.sp].moves || []));
      this.sel = new Set(pool.filter(id => base.includes(id)).slice(0, 4));
    }
    update() {
      const I = FF7.input, n = this.pool.length + 1;
      if (this.warn > 0) this.warn--;
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; sfx('cursor'); }
      if (!I.pressed('ok')) return;
      if (this.idx < this.pool.length) {
        const id = this.pool[this.idx];
        if (this.sel.has(id)) { this.sel.delete(id); sfx('cancel'); }
        else if (this.sel.size < 4) { this.sel.add(id); sfx('confirm'); }
        else sfx('error');
        return;
      }
      // (four, or all there are; at least one with no cooldown, when there is one to have: never a choice that can't be made)
      const anyFree = this.pool.some(id => !(KP.MOVES[id] || {}).cd);
      const ok = this.sel.size === Math.min(4, this.pool.length) && (!anyFree || [...this.sel].some(id => !(KP.MOVES[id] || {}).cd));
      if (!ok) { sfx('error'); this.warn = 90; return; }
      sfx('confirm'); S().pop(); this.w.result = [...this.sel]; this.w.done = true;
    }
    render() {
      R.fill('#000', 0.7);
      R.window(60, 20, W - 120, H - 40);
      R.textFit(this.title, 80, 32, W - 160, { size: 16, minSize: 12, color: R.COL.cyan });
      const want = Math.min(4, this.pool.length), anyFree = this.pool.some(id => !(KP.MOVES[id] || {}).cd);
      R.textFit(`${KP.name(this.mon)} — ${KP.jobName(this.mon)}: pick ${['', 'one', 'two', 'three', 'four'][want]} (${this.sel.size}/${want}).${anyFree ? ' At least one with no cooldown.' : ''}`, 80, 56, W - 180, { size: 12, minSize: 10, color: R.COL.gray });
      // the list (scrolling when long: a relearner's), then Done
      const n = this.pool.length + 1, rows = 9, rh = 27, y0 = 80, top = KP.listTop ? KP.listTop(this.idx, n, rows) : 0;
      for (let i = top; i < Math.min(n, top + rows); i++) {
        const y = y0 + (i - top) * rh;
        if (i === this.pool.length) { R.text('Done', 138, y, { size: 15, color: '#ffe080' }); continue; }
        const id = this.pool[i], mv = KP.MOVES[id], on = this.sel.has(id);
        R.text(on ? '■' : '□', 100, y, { size: 15, color: on ? '#80f0a0' : R.COL.gray });
        KP.typeGem(mv.type, 127, y + 10, 8);
        R.textFit(mv.name, 138, y, 230, { size: 15, minSize: 11 });
        R.text(`${mv.power ? 'Pow ' + mv.power : 'Status'}  Acc ${mv.acc}  CD ${mv.cd || '-'}`, W - 90, y + 2, { size: 12, align: 'right', color: R.COL.gray });
      }
      if (KP.drawScroll) KP.drawScroll(W - 76, y0, rows * rh, top, rows, n);
      R.cursor(86, y0 + 11 + (this.idx - top) * rh);
      // the highlighted move: its type, numbers and what it does
      const mv = this.idx < this.pool.length ? KP.MOVES[this.pool[this.idx]] : null, by = H - 124;
      R.ctx.fillStyle = 'rgba(10,16,40,0.85)'; R.ctx.fillRect(76, by, W - 152, 88);
      if (mv) {
        if (mv.type) KP.typeBadge(mv.type, 88, by + 8, 92, 16);
        R.text(`${KP.CATEGORY_LABEL ? KP.CATEGORY_LABEL[KP.category(mv)] : ''}${mv.power ? '   Power ' + mv.power : ''}   Accuracy ${mv.acc === true ? '—' : mv.acc}   Cooldown ${mv.cd ? mv.cd + ' turn' + (mv.cd > 1 ? 's' : '') : 'none'}${mv.prio ? '   Goes first' : ''}`, 190, by + 9, { size: 12, color: '#c8d8ff' });
        R.para(mv.desc || 'No description.', 88, by + 32, W - 176, { size: 13, minSize: 11, lines: 3 });
      } else R.para('Done: keep the four ticked.', 88, by + 32, W - 176, { size: 13, color: R.COL.gray, lines: 2 });
      if (this.warn) R.text('Pick four, including one with no cooldown.', W / 2, by - 18, { size: 13, align: 'center', color: '#ff9070' });
    }
  }

  // ------------------------------------------------------------------ evolution: the moogle on a dark stage, the light
  // flickering between its two jobs, the new one; then keep any old moves? The back button while the light flickers
  // stops it, as in Pokémon (the user, 2026-10-04: a recipe can need the earlier job, and nothing could keep one there);
  // it asks again the next time the moogle levels up, or at Coach Mog's (result false: it stayed)
  KP.evolveScene = function (mon) { const w = { done: false, result: false }; S().push(new Evolve(mon, w)); return w; };
  class Evolve {
    constructor(mon, w) {
      this.mon = mon; this.w = w; this.t = 0; this.text = null; this.cam = new MG.Cam(); this.ask = null;
      this.from = KP.sp(mon); this.toId = this.from.evo.to; this.mOld = KP.moogleModel(mon.sp); this.mNew = KP.moogleModel(this.toId);
      [this.mOld, this.mNew].forEach(m => { m.scale = 1.3; if (m.anims && m.anims.idle) m.play(m.anims.idle); });
      this.co = new FF7.Coroutine(this.flow());
    }
    *say(t, n) { this.text = t; let k = 0; while (this.text) { k++; if ((k > 10 && FF7.input.pressed('ok')) || k > (n || 120)) this.text = null; yield; } }
    *flow() {
      const old = KP.name(this.mon) + ' (' + KP.jobName(this.mon) + ')';
      yield* this.say(`What? ${KP.name(this.mon)} is changing jobs!`, 100);
      sfx('levelup');
      for (let i = 0; i < 150 && !this.stop; i++) { this.phase = i; this.showNew = (i > 40) && (Math.floor(i / Math.max(3, 18 - i / 10)) % 2 === 0); yield; }
      if (this.stop) {   // (stopped: the old job stays)
        this.showNew = false; this.phase = 999; sfx('cancel');
        yield* this.say(`Huh? ${KP.name(this.mon)} stopped changing jobs! It's still a ${KP.jobName(this.mon)}.`, 130);
        S().pop(); this.w.result = false; this.w.done = true; return;
      }
      this.showNew = true; this.phase = 999; sfx('ching');
      const oldMoves = this.mon.moves.slice();
      KP.evolve(this.mon);
      yield* this.say(`Congratulations! ${old} became a ${KP.jobName(this.mon)}!`, 130);
      // with learnsets: it keeps its moves and learns the new job's evolution move (the forget-a-move choice at four)
      if (KP.LEARN && KP.LEARN[this.mon.sp] && KP.learnOnLevels) { yield* KP.learnOnLevels((t) => this.say(t, 110), this.mon, [this.mon.lv]); S().pop(); this.w.result = true; this.w.done = true; return; }
      const pool = Array.from(new Set(oldMoves.concat(KP.sp(this.mon).moves)));   // (no learnset: what it knew and the new job's four)
      if (pool.length > 4) {
        this.ask = { idx: 1 };
        while (this.ask && !this.ask.done) yield;
        if (this.ask.keep) { const r = yield KP.pickMoves(this.mon, pool, `${KP.name(this.mon)}'s moves: keep any old ones?`); if (r) this.mon.moves = r; }
        this.ask = null;
      }
      S().pop(); this.w.result = true; this.w.done = true;
    }
    update() {
      this.t++;
      if (this.ask && !this.ask.done) {
        const I = FF7.input;
        if (I.repeat('up') || I.repeat('down')) { this.ask.idx = 1 - this.ask.idx; sfx('cursor'); }
        if (I.pressed('ok')) { sfx('confirm'); this.ask.keep = this.ask.idx === 0; this.ask.done = true; }
      }
      if (this.phase != null && this.phase < 150 && !this.stop && FF7.input.back()) this.stop = true;   // (the back button: stop it)
      this.co.update();
      (this.showNew ? this.mNew : this.mOld).update(1);
    }
    render() {
      MG.sky('#06080e', '#141a2a');
      this.cam.set([0, 0.85, 3.2], [0, 0.55, 0], 40, 0.1, 50);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.9, 0.9, 0.95], ambient: [0.45, 0.45, 0.55] } });
      this.cam.apply();
      const m = this.showNew ? this.mNew : this.mOld, glow = this.phase > 40 && this.phase < 999;
      MG.drawModel(m, [0, 0, 0], this.t * 0.02, 0, 0, glow ? { add: [0.75, 0.75, 0.8] } : null);
      GL.end();
      R.window(0, H - 96, W, 96);
      if (this.text) R.para(this.text, 22, H - 82, W - 44, { size: 17, minSize: 14, lines: 3 });
      else if (this.phase != null && this.phase < 150 && !this.stop) R.text(`${FF7.input.label('cancel')}: stop the job change`, W - 22, H - 30, { size: 13, align: 'right', color: 'rgba(200,210,240,0.75)' });   // (the player's own key)
      if (this.ask && !this.ask.done) {
        R.text(`${KP.name(this.mon)}'s new job comes with new moves. Keep any of its old ones?`, 22, H - 80, { size: 16 });
        R.window(W - 260, H - 190, 240, 90);
        R.text('Yes, let me choose', W - 216, H - 176, { size: 15 }); R.text('No, the new ones', W - 216, H - 146, { size: 15 });
        R.cursor(W - 232, H - 165 + this.ask.idx * 30);
      }
    }
  }
  KP.Evolve = Evolve; KP.Picker = Picker;
})();

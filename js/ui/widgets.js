// UI widgets living on the scene manager's overlay layer: dialogue boxes, captions, banners,
// name entry, party select, disc-change screen.
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, S = FF7.sceneMgr;
  const UI = FF7.ui;
  const FONT = 17, LINE = 22, PAD = 14;

  // ---------------------------------------------------------------- dialogue box
  // the answer Cancel picks when the script doesn't name one (opts.cancel; false: none): the choice's "No" - No, Not now,
  // Leave it, Never mind, Maybe later... A bare Stay / Leave counts only as the last answer: an inn's ['Stay', 'Leave']
  // declines with Leave, a ledge's ['Jump down', 'Stay'] with Stay.
  const DECLINE = /^(no\b|nope|nah\b|not (now|yet|here|this one|really|today|right now)|nothing(,? thanks| today| right now)?$|never ?mind|cancel$|leave (it|them|her|him)\b(?! to\b)|quit|forget it|maybe later|later$|i['’]?ll (pass|manage)|pass$|stop reading|don['’]?t$|don['’]?t (buy anything|need it)|keep it$|too expensive|that['’]?s enough|enough$|i['’]?d rather not|give (me|us) a minute|hold on a sec|keep looking|sorry, we can['’]?t|keep flying|look around)/i;
  const declineOf = (choices) => {
    const bare = choices.map(c => c.replace(/^[\s(.…]+|[\s).!…]+$/g, ''));   // (without "(", "...", "." or "!")
    for (let i = bare.length - 1; i >= 0; i--) if (DECLINE.test(bare[i]) || (i === bare.length - 1 && /^(stay|leave)$/i.test(bare[i]))) return i;
    return null;
  };
  class TextBox {
    constructor(name, text, opts = {}) {
      this.modal = true; this.done = false; this.result = undefined;
      this.name = name;
      this.opts = opts;
      this.choices = opts.choices ? opts.choices.map(c => U.names(String(c))) : null;   // {AERIS} etc. in answers too
      this.cancelTo = !this.choices || opts.cancel === false ? null : opts.cancel != null ? opts.cancel : declineOf(this.choices);
      this.cursor = opts.default || 0;
      let t = U.names(Array.isArray(text) ? text.join('\f') : String(text == null ? '' : text));
      if (name && !opts.noQuotes && t.trim() && !/^[“"(‘'{\[]/.test(t.trim())) t = '“' + t.replace(/\f/g, '”\f“') + '”';
      const maxW = opts.width || 540;
      this.maxTextW = maxW - PAD * 2 - 8;
      // paginate
      this.pages = [];
      t.split('\f').forEach(pg => {
        const lines = R.wrap(pg, this.maxTextW, FONT);
        for (let i = 0; i < lines.length; i += 4) this.pages.push(lines.slice(i, i + 4));
      });
      if (!this.pages.length) this.pages.push(['']);
      this.page = 0; this.shown = 0; this.t = 0; this.open = 0;
      this.speed = (opts.speed || (FF7.state ? 0.6 + FF7.state.config.fieldMsgSpeed * 2.4 : 1.5));
      this.layout();
    }
    layout() {
      const lines = this.pages[this.page];
      let w = Math.max(...lines.map(l => R.measure(l, FONT))) + PAD * 2 + 26;   // (+16: room for the ▼ "next" mark)
      if (this.name) w = Math.max(w, R.measure(this.name, FONT) + PAD * 2);
      if (this.choices && this.page === this.pages.length - 1) w = Math.max(w, ...this.choices.map(c => R.measure(c, FONT) + PAD * 2 + 44));
      this.w = U.clamp(Math.round(w), 160, this.opts.width || 580);
      const nLines = lines.length + (this.name ? 1 : 0) + (this.choices && this.page === this.pages.length - 1 ? this.choices.length : 0);
      this.h = nLines * LINE + PAD * 2 - 2;
      this.x = this.opts.x != null ? this.opts.x : Math.round((FF7.W - this.w) / 2);
      const pos = this.opts.pos || 'top';
      this.y = this.opts.y != null ? this.opts.y : (pos === 'bottom' ? FF7.H - this.h - 14 : pos === 'middle' ? Math.round((FF7.H - this.h) / 2) : 14);
      this.chars = lines.join('').length;
    }
    update(focus) {
      this.t++;
      if (this.open < 1) { this.open = Math.min(1, this.open + 0.25); return; }
      if (this.shown < this.chars) this.shown = Math.min(this.chars, this.shown + this.speed);
      if (this.opts.auto && this.t > this.opts.auto) { this.done = true; return; }
      if (!focus) return;
      const lastPage = this.page === this.pages.length - 1;
      if (this.choices && lastPage && this.shown >= this.chars) {
        if (I.repeat('up')) { this.cursor = (this.cursor + this.choices.length - 1) % this.choices.length; FF7.audio.sfx('cursor'); }
        if (I.repeat('down')) { this.cursor = (this.cursor + 1) % this.choices.length; FF7.audio.sfx('cursor'); }
        if (I.pressed('ok')) { FF7.audio.sfx('confirm'); this.result = this.cursor; this.done = true; }
        if (I.pressed('cancel') && this.cancelTo != null) { FF7.audio.sfx('cancel'); this.cursor = this.cancelTo; this.result = this.cancelTo; this.done = true; }
        return;
      }
      if (I.pressed('ok') || (I.held('cancel') && this.opts.skippable)) {
        if (this.shown < this.chars) { this.shown = this.chars; return; }
        if (!lastPage) { this.page++; this.shown = 0; this.layout(); return; }
        this.done = true;
      }
    }
    render() {
      const a = this.open;
      const h = Math.max(10, this.h * a);
      R.window(this.x, this.y + (this.h - h) / 2, this.w, h, { alpha: Math.min(1, a * 1.5) });
      if (a < 1) return;
      // the block of lines centred in the box: a line's capitals run from ~1 to ~13 px under its y (the 'top'
      // baseline), so with 22 px lines and the box PAD * 2 - 2 taller than them, the first line goes 17 down
      let y = this.y + PAD + 3;
      const x = this.x + PAD + 4;
      if (this.name) { R.text(this.name, x, y, { size: FONT }); y += LINE; }
      let left = this.shown;
      const lines = this.pages[this.page];
      const qIndent = this.name && lines[0] && lines[0].startsWith('“') ? R.measure('“', FONT) : 0;
      lines.forEach((l, i) => {
        if (left <= 0) return;
        const part = l.slice(0, Math.floor(left));
        left -= l.length;
        R.text(part, x + (i > 0 ? qIndent : 0), y, { size: FONT });
        y += LINE;
      });
      const lastPage = this.page === this.pages.length - 1;
      if (this.choices && lastPage && this.shown >= this.chars) {
        this.choices.forEach((c, i) => {
          R.text(c, x + 34, y, { size: FONT });
          if (i === this.cursor) R.cursor(x + 28, y + 10);
          y += LINE;
        });
      } else if (this.shown >= this.chars && !this.opts.auto) {
        // "next" indicator
        const bx = this.x + this.w - 22, by = this.y + this.h - 16 + Math.sin(this.t / 6) * 2;
        R.ctx.fillStyle = '#e8e8e8'; R.ctx.beginPath(); R.ctx.moveTo(bx, by); R.ctx.lineTo(bx + 10, by); R.ctx.lineTo(bx + 5, by + 6); R.ctx.fill();
      }
    }
  }
  UI.TextBox = TextBox;
  UI.textBox = (name, text, opts) => S.addWidget(new TextBox(name, text, opts));

  // ---------------------------------------------------------------- caption (centered narration)
  class Caption {
    constructor(text, opts = {}) {
      this.modal = true; this.done = false; this.opts = opts;
      this.lines = U.names(String(text)).split('\n');
      this.t = 0; this.fade = 0; this.closing = false;
      this.bg = opts.bg != null ? opts.bg : 'rgba(0,0,0,0.85)';
      this.aboveFade = !!opts.aboveFade;
      this.hold = opts.hold || 0;
    }
    update(focus) {
      this.t++;
      if (this.closing) { this.fade -= 0.06; if (this.fade <= 0) this.done = true; return; }
      this.fade = Math.min(1, this.fade + 0.05);
      if (this.hold && this.t > this.hold) { this.closing = true; return; }
      if (focus && this.fade >= 1 && !this.hold && (I.pressed('ok') || I.pressed('cancel'))) this.closing = true;
    }
    render() {
      const c = R.ctx;
      c.save(); c.globalAlpha = this.fade;
      if (this.bg) { c.fillStyle = this.bg; c.fillRect(0, 0, FF7.W, FF7.H); }
      const size = this.opts.size || 20;
      // wrap long lines to the screen width (with margins) so narration never runs off the edges
      if (!this.wrapped) { this.wrapped = [].concat(...this.lines.map(l => R.wrap(l, FF7.W - 80, size))); }
      const lines = this.wrapped;
      const total = lines.length * (size + 10);
      lines.forEach((l, i) => R.text(l, FF7.W / 2, FF7.H / 2 - total / 2 + i * (size + 10), { align: 'center', size, color: this.opts.color || '#e8e8f0' }));
      c.restore();
    }
  }
  UI.caption = (text, opts) => S.addWidget(new Caption(text, opts));

  // ---------------------------------------------------------------- banner (non-modal, timed)
  class Banner {
    constructor(text, opts = {}) { this.modal = false; this.done = false; this.text = text; this.t = opts.frames || 60; this.opts = opts; }
    update() { if (--this.t <= 0) this.done = true; }
    render() {
      const w = Math.max(160, R.measure(this.text, 17) + 40);
      const x = (FF7.W - w) / 2, y = this.opts.y != null ? this.opts.y : 10;
      R.window(x, y, w, 36);
      R.text(this.text, FF7.W / 2, y + 9, { align: 'center' });
    }
  }
  UI.Banner = Banner;
  UI.banner = (text, opts) => S.addWidget(new Banner(text, opts));

  // ---------------------------------------------------------------- name entry
  // FF7's naming screen: the cursor picks letters off the grid (OK adds one, up to 9), Cancel deletes the last,
  // Enter (the menu button) or Start finishes; the bottom row resets to the default name, finishes, or deletes
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?&-.\' ';
  class NameEntry {
    // o.def: the default name (for someone who isn't an FF7 character, e.g. Kupomon's rival); o.noPortrait
    constructor(id, o = {}) {
      this.modal = true; this.done = false; this.id = id; this.o = o;
      const def = o.def ? { name: o.def } : FF7.data.characters[id] || { name: id };
      this.defName = def.name;
      const cur = FF7.state.chars[id] && FF7.state.chars[id].name;
      this.name = cur && cur !== 'Ex-SOLDIER' ? cur : def.name;   // Cloud is 'Ex-SOLDIER' until named
      this.cols = 13; this.cx = 0; this.cy = 0; this.t = 0;
      this.grid = LETTERS.split('');
      this.rows = Math.ceil(this.grid.length / this.cols) + 1; // last row: Default / Select / Delete
    }
    update(focus) {
      this.t++;
      if (!focus) return;
      if (I.repeat('left')) { this.cx = (this.cx + this.cols - 1) % this.cols; FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { this.cx = (this.cx + 1) % this.cols; FF7.audio.sfx('cursor'); }
      if (I.repeat('up')) { this.cy = (this.cy + this.rows - 1) % this.rows; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.cy = (this.cy + 1) % this.rows; FF7.audio.sfx('cursor'); }
      if (I.pressed('ok')) {
        if (this.cy === this.rows - 1) {
          if (this.cx < 4) { this.name = this.defName; FF7.audio.sfx('confirm'); }
          else if (this.cx < 9) this.finish();
          else this.erase();
        } else {
          const ch = this.grid[this.cy * this.cols + this.cx];
          if (ch == null || this.name.length >= 9) FF7.audio.sfx('error');
          else { this.name += ch; FF7.audio.sfx('cursor'); }
        }
      } else if (I.pressed('cancel')) this.erase();   // (not I.back(): that is the menu button too, which finishes)
      if (I.pressed('menu') || I.pressed('start')) this.finish();
    }
    erase() { if (this.name.length) { this.name = this.name.slice(0, -1); FF7.audio.sfx('cancel'); } else FF7.audio.sfx('error'); }
    finish() {
      if (!this.name.trim()) this.name = this.defName;
      const st = FF7.state;
      if (!st.chars[this.id]) FF7.sys.party.join(this.id, { toParty: false });
      st.chars[this.id].name = this.name.trim();
      FF7.audio.sfx('confirm');
      this.done = true;
    }
    render() {
      R.fill('#000', 0.6);
      R.window(40, 30, 560, 110);
      const p = !this.o.noPortrait && FF7.gfx && FF7.render.portrait(this.id);
      if (p) R.img(p, 56, 44, 80, 80);
      R.text('Please enter a name.', 150, 46, { color: R.COL.cyan });
      R.text(this.name + (this.t % 40 < 20 ? '_' : ''), 150, 80, { size: 26 });
      R.window(40, 150, 560, 290);
      for (let i = 0; i < this.grid.length; i++) {
        const cx = i % this.cols, cy = Math.floor(i / this.cols);
        const ch = this.grid[i] === ' ' ? '␣' : this.grid[i];
        R.text(ch, 88 + cx * 40, 170 + cy * 40, { size: 20, align: 'center' });   // (centred in a 40 px cell)
      }
      const ly = 170 + (this.rows - 1) * 40;
      R.text('Default', 80, ly); R.text('Select', 240, ly); R.text('Delete', 440, ly);
      // (the hand just left of the letter, small enough to clear the one before it)
      if (this.cy === this.rows - 1) R.cursor(this.cx < 4 ? 74 : this.cx < 9 ? 234 : 434, ly + 11);
      else R.cursor(88 + this.cx * 40 - 9, 170 + this.cy * 40 + 11, { scale: 0.72 });
      R.text(`${I.label('ok')}: add a letter      ${I.label('cancel')}: delete      ${I.label('menu')}: done`, FF7.W / 2, 452, { align: 'center', size: 13, color: R.COL.gray });
    }
  }
  UI.nameEntry = (id, o) => S.addWidget(new NameEntry(id, o));

  // ---------------------------------------------------------------- party select (PHS-style)
  class PartySelect {
    constructor(required = [], opts = {}) {
      this.modal = true; this.done = false;
      this.required = required.slice();
      const st = FF7.state;
      this.members = st.members.filter(id => st.chars[id] && !(opts.exclude || []).includes(id) && (!FF7.sys.party.isAway(id) || required.includes(id)));
      this.party = st.party.filter(Boolean).filter(id => this.members.includes(id));
      // required members join behind the current leader (the leader keeps the lead)
      this.required.forEach(r => { if (!this.party.includes(r)) this.party.splice(Math.min(1, this.party.length), 0, r); });
      while (this.party.length > 3) { let k = this.party.length - 1; while (k > 0 && this.required.includes(this.party[k])) k--; this.party.splice(k, 1); }
      this.cursor = 0; this.msg = opts.msg || 'Form your party.';
    }
    update(focus) {
      if (!focus) return;
      const n = this.members.length + 1;
      if (I.repeat('up')) { this.cursor = (this.cursor + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.cursor = (this.cursor + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.pressed('ok')) {
        if (this.cursor === this.members.length) {
          if (this.party.length === Math.min(3, this.members.length)) { FF7.sys.party.set(this.party); FF7.audio.sfx('confirm'); this.done = true; }
          else FF7.audio.sfx('error');
          return;
        }
        const id = this.members[this.cursor];
        const i = this.party.indexOf(id);
        if (i >= 0) { if (this.required.includes(id)) FF7.audio.sfx('error'); else { this.party.splice(i, 1); FF7.audio.sfx('cancel'); } }
        else if (this.party.length < 3) { this.party.push(id); FF7.audio.sfx('confirm'); }
        else FF7.audio.sfx('error');
      }
    }
    render() {
      R.fill('#000', 0.55);
      R.window(120, 20, 400, 40);
      R.text(this.msg, 320, 30, { align: 'center' });
      // (rows shrink to fit the screen: with the Turks there can be twelve lines)
      const rh = Math.min(44, Math.floor(380 / (this.members.length + 1))), h = (this.members.length + 1) * rh + 24;
      R.window(120, 70, 400, h);
      this.members.forEach((id, i) => {
        const c = FF7.state.chars[id];
        const y = 84 + i * rh;
        const inP = this.party.includes(id);
        R.text(c.name, 190, y + rh / 2 - 14, { color: inP ? R.COL.yellow : R.COL.white });
        R.text('LV ' + c.level, 360, y + rh / 2 - 14, { color: R.COL.cyan });
        if (inP) R.text('✓', 470, y + rh / 2 - 14, { color: R.COL.green });
        if (this.cursor === i) R.cursor(178, y + rh / 2 - 4);
      });
      const y = 84 + this.members.length * rh;
      R.text('Done', 190, y + rh / 2 - 14, { color: this.party.length === Math.min(3, this.members.length) ? R.COL.white : R.COL.gray });
      if (this.cursor === this.members.length) R.cursor(178, y + rh / 2 - 4);
    }
  }
  UI.partySelect = (req, opts) => S.addWidget(new PartySelect(req, opts));

  // ---------------------------------------------------------------- the other parties (a split-party battle)
  // Bizarro·Sephiroth: the members who came along split into Party 2 and Party 3 (one to three each). Left / right
  // (or OK) moves the one under the cursor to the other party; Done closes. result: [[party 2], [party 3]]
  class PartiesForm {
    constructor(ids, opts = {}) {
      this.modal = true; this.done = false; this.cursor = 0;
      this.ids = ids.slice();
      this.of = {}; this.ids.forEach((id, i) => { this.of[id] = i < Math.ceil(this.ids.length / 2) ? 2 : 3; });
      this.lead = (opts.lead || FF7.state.party).filter(Boolean);
    }
    parts() { return [2, 3].map(n => this.ids.filter(id => this.of[id] === n)); }
    ok() { return this.parts().every(p => p.length >= 1 && p.length <= 3); }
    update(focus) {
      if (!focus) return;
      const n = this.ids.length + 1;
      if (I.repeat('up')) { this.cursor = (this.cursor + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.cursor = (this.cursor + 1) % n; FF7.audio.sfx('cursor'); }
      if (this.cursor < this.ids.length && (I.repeat('left') || I.repeat('right') || I.pressed('ok'))) {
        const id = this.ids[this.cursor]; this.of[id] = this.of[id] === 2 ? 3 : 2; FF7.audio.sfx('cursor');
      } else if (this.cursor === this.ids.length && I.pressed('ok')) {
        if (this.ok()) { FF7.audio.sfx('confirm'); this.result = this.parts(); this.done = true; } else FF7.audio.sfx('error');
      }
    }
    render() {
      R.fill('#000', 0.55);
      R.window(80, 20, 480, 64);
      R.text('Form the other parties.', 320, 28, { align: 'center' });
      R.text('Party 1: ' + this.lead.map(id => FF7.state.chars[id].name).join(', '), 320, 54, { align: 'center', size: 14, color: R.COL.cyan });
      const rh = 40, h = (this.ids.length + 1) * rh + 24;
      R.window(80, 92, 480, h);
      this.ids.forEach((id, i) => {
        const c = FF7.state.chars[id], y = 106 + i * rh, p = this.of[id];
        R.text(c.name, 150, y + 6);
        R.text('LV ' + c.level, 300, y + 6, { color: R.COL.cyan });
        R.text('◀  Party ' + p + '  ▶', 470, y + 6, { align: 'center', color: p === 2 ? R.COL.white : R.COL.yellow });
        if (this.cursor === i) R.cursor(138, y + 16);
      });
      const y = 106 + this.ids.length * rh;
      R.text('Done', 150, y + 6, { color: this.ok() ? R.COL.white : R.COL.gray });
      if (this.cursor === this.ids.length) R.cursor(138, y + 16);
      R.text(this.ok() ? 'When one party falls, the next takes over.' : 'Each party needs one to three members.', 320, 92 + h + 10, { align: 'center', size: 13, color: R.COL.gray });
    }
  }
  UI.partiesForm = (ids, opts) => S.addWidget(new PartiesForm(ids, opts));

  // ---------------------------------------------------------------- end of disc
  UI.discEnd = function (n) {
    return FF7.co(function* () {
      yield S.fadeOut(60);
      FF7.audio.stop(60);
      const cap = UI.caption(`END OF DISC ${n}\n\nPlease insert Disc ${n + 1}`, { bg: '#000', aboveFade: true, size: 22 });
      yield cap;
      FF7.state.disc = n + 1;
      const w = UI.saveMenu({ mode: 'save', aboveFade: true, msg: 'Save your progress?' });
      yield w;
      yield 30;
    });
  };

  // Small helper: a timed notice in the middle of the screen
  UI.notice = (text, frames = 90) => S.addWidget(new Banner(text, { frames, y: 200 }));
})();

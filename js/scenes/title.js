// Title screen: the FF7 logo (Meteor emblem) on black, NEW GAME / Continue with the glove cursor.
(function () {
  const R = FF7.render, I = FF7.input, U = FF7.util;

  // Draws the "FINAL FANTASY VII" logo with the Meteor emblem (procedural, no image assets)
  function drawLogo(c, cx, cy, t, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.textBaseline = 'middle'; c.textAlign = 'left';
    // lay out "FINAL FANTASY" + gap + "VII" from measured widths, centred on cx
    const f1 = `600 40px "Times New Roman", Georgia, serif`, f2 = `600 50px "Times New Roman", Georgia, serif`;
    c.font = f1; const w1 = c.measureText('FINAL FANTASY').width;
    c.font = f2; const w2 = c.measureText('VII').width;
    const gap = 22, x0 = cx - (w1 + gap + w2) / 2, xv = x0 + w1 + gap;
    // Meteor behind "VII": a glowing green-blue sphere trailing up to the right
    const mx = xv + w2 * 0.5, my = cy - 4;
    const tail = c.createLinearGradient(mx, my, mx + 150, my - 110);
    tail.addColorStop(0, 'rgba(120,230,255,0.75)'); tail.addColorStop(0.45, 'rgba(60,160,220,0.3)'); tail.addColorStop(1, 'rgba(20,60,120,0)');
    c.fillStyle = tail;
    c.beginPath(); c.moveTo(mx - 20, my + 12); c.quadraticCurveTo(mx + 60, my - 40, mx + 160, my - 115); c.quadraticCurveTo(mx + 70, my - 22, mx + 22, my - 20); c.closePath(); c.fill();
    const g = c.createRadialGradient(mx - 6, my - 6, 2, mx, my, 36);
    g.addColorStop(0, 'rgba(240,255,248,0.95)'); g.addColorStop(0.3, 'rgba(128,240,208,0.85)'); g.addColorStop(0.65, 'rgba(32,144,192,0.6)'); g.addColorStop(1, 'rgba(10,40,90,0)');
    c.fillStyle = g; c.beginPath(); c.arc(mx, my, 36, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 6; i++) { const a = t * 0.02 + i; c.fillStyle = `rgba(160,255,230,${0.3 + 0.3 * Math.sin(t * 0.1 + i)})`; c.fillRect(mx + Math.cos(a) * 24 + 36 + i * 10, my - 26 - i * 12, 2, 2); }
    // lettering
    const tg = c.createLinearGradient(0, cy - 24, 0, cy + 22); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#a8b8d8');
    c.fillStyle = tg; c.shadowColor = 'rgba(80,160,255,0.6)'; c.shadowBlur = 10;
    c.font = f1; c.fillText('FINAL FANTASY', x0, cy);
    c.font = f2; c.fillText('VII', xv, cy + 2);
    c.restore();
  }
  FF7.drawLogo = drawLogo;

  class Title {
    constructor() {
      this.isTitle = true; this.noClock = true;
      this.t = 0; this.idx = 0;
      this.hasSave = Title.anySave();
      this.idx = this.hasSave ? 1 : 0;
      this.busy = false;
      // Config: the settings, shared by every file (FF7.prefs). Theater: the story's cutscenes as you reach them
      // (js/ui/theater.js). Achievements: js/systems/achievements.js. Demo: the runner plays a new game (js/runner/demo.js)
      this.items = ['NEW GAME', 'Continue', 'Config', 'Theater', 'Achievements', 'Demo'];
      if (FF7.DEBUG) this.items.push('Debug');
    }
    // (any of the 15 files, the Autosave or the old Demo file: the Load screen lists them all)
    static anySave() { return FF7.save.list().some(Boolean) || !!(FF7.save.autoSummary && FF7.save.autoSummary()) || !!(FF7.save.demoSummary && FF7.save.demoSummary()); }
    enter() { FF7.audio.play('prelude', { fade: 20 }); }   // (FF7's harp Prelude)
    resume() { this.busy = false; this.hasSave = Title.anySave(); }
    update(canInput) {
      this.t++;
      if (!canInput || this.busy || this.t < 50) return;
      if (I.repeat('up')) { this.idx = (this.idx + this.items.length - 1) % this.items.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % this.items.length; FF7.audio.sfx('cursor'); }
      if (I.pressed('ok') || I.pressed('start')) this.choose();
    }
    choose() {
      const S = FF7.sceneMgr, self = this;
      const it = this.items[this.idx];
      if (it === 'Continue') {
        if (!this.hasSave) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        this.busy = true;
        const w = FF7.ui.saveMenu({ mode: 'load' });
        S.run((function* () { yield w; self.busy = false; })());
        return;
      }
      if (it === 'Debug') { FF7.audio.sfx('confirm'); FF7.scenes.openDebug && FF7.scenes.openDebug(); return; }
      if (it === 'Config') { FF7.audio.sfx('confirm'); FF7.ui.openConfig(); return; }
      if (it === 'Theater') { FF7.audio.sfx('confirm'); S.push(new FF7.scenes.Theater()); return; }
      if (it === 'Achievements') { FF7.audio.sfx('confirm'); FF7.achievements.open(); return; }
      if (it === 'Demo') {
        // the runner takes the controls, picks NEW GAME itself and plays in real time (Esc hands over)
        if (!FF7.runner || !FF7.runner.demo || !FF7.runner.demo.start()) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm');
        return;
      }
      // NEW GAME
      FF7.audio.sfx('confirm');
      this.busy = true;
      S.run((function* () {
        yield S.fadeOut(60);
        FF7.newGame();
        FF7.story.begin();
        yield 2;
        yield S.fadeIn(30);
      })());
    }
    render() {
      const c = R.ctx;
      c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      // faint stars
      for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + 0.25 * U.hash(i, 3)})`; c.fillRect(U.hash(i, 1) * FF7.W, U.hash(i, 2) * FF7.H * 0.6, 1.5, 1.5); }
      const a = Math.min(1, this.t / 90);
      drawLogo(c, FF7.W / 2, 170, this.t, a);
      if (this.t > 50) {
        const ma = Math.min(1, (this.t - 50) / 30);
        c.save(); c.globalAlpha = ma;
        this.items.forEach((s, i) => {
          const dim = s === 'Continue' && !this.hasSave;
          R.text(s, FF7.W / 2, 282 + i * 28, { align: 'center', size: 20, color: dim ? R.COL.gray : R.COL.white });
        });
        R.setFont(20); const tw = R.ctx.measureText(this.items[this.idx]).width;
        R.cursor(FF7.W / 2 - tw / 2 - 8, 293 + this.idx * 28);
        R.text('Non-commercial study recreation · not affiliated with Square Enix', FF7.W / 2, 450, { align: 'center', size: 11, color: '#6a6a7a' });
        c.restore();
      }
    }
  }
  FF7.scenes.Title = Title;
})();

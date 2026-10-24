// Quality-of-life additions the PS1 game doesn't have. Each one is a Config option (on by default):
//  - Fast-Forward: the ` key cycles 1x / 2x / 4x / 8x in normal play too (the Demo has its own), shown in the corner
//  - Autosave: a file of its own (not one of the 15), written once the player has control on each new map
//  - Hints: the main menu's box with the story's next objective (the runner's route) and the treasure left here
//  (always: the movies' "Tab: Skip" notice and Skip prompt, Q.MovieSkip below; and, elsewhere: the Limit screen's progress (menu_main.js), Sense's elements (actions.js), Config > Controls)
(function () {
  const Q = FF7.qol = { speed: 1, savedKey: null };
  const SPEEDS = [1, 2, 4, 8];
  const cfg = () => (FF7.state && FF7.state.config) || {};
  const on = (k) => cfg()[k] !== false;
  // (the Demo, or the runner in any mode - tools/run_runner.js - plays: no autosave, no pause, its own speed)
  const demoOn = () => !!(FF7.runner && (FF7.runner.active || (FF7.runner.demo && FF7.runner.demo.active)));
  Q.on = on;

  // every game frame, after the input update (main.js FF7.stepFrame)
  Q.frame = function () {
    if (!FF7.state) return;
    if (demoOn()) { Q.speed = 1; return; }   // (the Demo sets its own speed; after it, 1x)
    if (FF7.input.pressed('ff') && on('fastForward')) {
      Q.speed = SPEEDS[(SPEEDS.indexOf(Q.speed) + 1) % SPEEDS.length];
      FF7.timeScale = Q.speed;
    }
    if (!on('fastForward') && Q.speed !== 1) { Q.speed = 1; FF7.timeScale = 1; }
    Q.autosaveTick();
  };

  // ---- autosave: once per map visit, after the player has had control for 45 frames in a row (never in the middle
  // of an event, a transition or a modal window; on the world map, on foot)
  let freeN = 0, worldN = 0;
  Q.autosaveTick = function () {
    if (!on('autosave') || !FF7.save.writeAuto || FF7.state === FF7.devState || FF7.state.kupomon) return;   // (not a test game: js/main.js; not inside Kupomon)
    const R = FF7.runner, top = FF7.sceneMgr.top();
    if (!R || !top || !R.isField) return;
    let key = null, free = false;
    if (R.isField(top) && top.map) {
      key = 'f:' + top.map.id + ':' + top.loadGen;
      free = R.fieldFree(top) && FF7.state.loc.mode === 'field';
    } else if (R.isWorld(top)) {
      key = 'w:' + (top._qolId || (top._qolId = ++worldN));
      free = !(top.busy || top.transitioning) && !(FF7.state.world && FF7.state.world.vehicle);
    }
    if (!key || key === Q.savedKey) { freeN = 0; return; }
    free = free && !R.topModal() && !FF7.sceneMgr.transition && !(FF7.sceneMgr.fader.alpha > 0);
    freeN = free ? freeN + 1 : 0;
    if (freeN < 45) return;
    freeN = 0;
    if (R.isWorld(top) && top.saveLoc) top.saveLoc();
    if (FF7.save.writeAuto(FF7.state)) Q.savedKey = key;
  };

  // ---- drawn over everything (main.js, after the scenes): the fast-forward speed
  Q.draw = function () {
    const Rn = FF7.render, c = Rn.ctx;
    if (!c || !FF7.state) return;
    Rn.reset();
    if (!demoOn() && FF7.timeScale > 1) {
      c.fillStyle = 'rgba(0,0,16,0.62)'; c.fillRect(FF7.W - 58, 4, 54, 20);
      Rn.text('▶▶ ' + FF7.timeScale + '×', FF7.W - 31, 7, { align: 'center', size: 13, color: '#ffd860' });
    }
  };

  // ---- movies (js/gfx/cinema.js, js/gfx/fmv.js): a small "Tab: Skip" notice in the corner, and Tab (Start) asks
  // "Skip this cutscene?" (Yes first; Tab again also says Yes) over the movie, which holds - picture, music and
  // sounds - while it is asked. The notice is bright for the first five seconds, then stays faint; any other button
  // brings it back. Each movie scene owns one:
  //   this.skip = new FF7.qol.MovieSkip(held => ...)    (the scene's own part of holding: the video)
  //   update: const k = this.skip.update(canInput, ready); 'skip': Yes, finish; 'hold': asking, don't advance
  //   render: this.skip.draw()
  // (The Demo answers the prompt: js/runner/runner.js R.onMovie)
  class MovieSkip {
    constructor(onHold) { this.onHold = onHold; this.t = 0; this.ask = null; this.poke = 0; this.music = null; this.sfx = []; }
    update(canInput, ready) {
      const I = FF7.input, A = FF7.audio;
      if (this.ask) {
        this.ask.t++;
        if (!canInput) return 'hold';
        if (I.repeat('up') || I.repeat('down')) { this.ask.idx = 1 - this.ask.idx; A.sfx('cursor'); }
        if (I.pressed('start') || (I.pressed('ok') && this.ask.idx === 0)) { A.sfx('confirm'); this.close(true); return 'skip'; }
        if (I.pressed('ok') || I.back()) { A.sfx('cancel'); this.close(false); }
        return 'hold';
      }
      if (!ready) return null;
      this.t++;
      if (this.poke > 0) this.poke--;
      if (!canInput) return null;
      if (I.pressed('start')) { this.ask = { idx: 0, t: 0 }; this.hold(true); A.sfx('cursor'); return 'hold'; }
      if (['ok', 'cancel', 'menu', 'square', 'up', 'down', 'left', 'right'].some(b => I.pressed(b))) this.poke = 150;
      return null;
    }
    close(skipping) { this.ask = null; this.hold(false, skipping); }
    // hold the movie's music and sounds (the sounds stay stopped when it is skipped; the music is the story's to stop)
    hold(on, skipping) {
      const A = FF7.audio;
      if (on) {
        const el = A.current && A.current.el;
        this.music = el && !el.paused ? el : null; if (this.music) this.music.pause();
        this.sfx = []; for (const id in A.sfxPool) A.sfxPool[id].forEach(e => { if (!e.paused && !e.ended) { e.pause(); this.sfx.push(e); } });
      } else {
        if (this.music) this.music.play().catch(() => {});
        if (!skipping) this.sfx.forEach(e => e.play().catch(() => {}));
        this.music = null; this.sfx = [];
      }
      if (this.onHold) this.onHold(on, skipping);
    }
    draw() {
      const R = FF7.render, c = R.ctx;
      if (this.ask) {
        R.fill('#000', 0.35);
        R.window(200, 180, 240, 110);
        R.text('Skip this cutscene?', 320, 194, { align: 'center', size: 16 });
        R.text('Yes', 290, 226); R.text('No', 290, 254);
        R.cursor(284, 236 + this.ask.idx * 28);
        return;
      }
      if (this.t <= 0) return;
      const cl = (v) => Math.max(0, Math.min(1, v));
      const bright = Math.max(cl((330 - this.t) / 30), cl(this.poke / 30));
      const label = FF7.input.label('start') + ': Skip', w = Math.ceil(R.measure(label, 13)) + 18;   // (Tab; the pad's button when one is connected)
      const x = FF7.W - 8 - w, y = 8 + (FF7.timeScale > 1 ? 22 : 0);   // (under the fast-forward speed, when it shows)
      c.save();
      c.globalAlpha = cl(this.t / 20) * (0.35 + 0.65 * bright);
      c.fillStyle = 'rgba(0,0,16,0.6)'; c.fillRect(x, y, w, 20);
      c.strokeStyle = 'rgba(200,210,255,0.35)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, 19);
      R.text(label, x + w / 2, y + 3, { align: 'center', size: 13 });
      c.restore();
    }
  }
  Q.MovieSkip = MovieSkip;

  // ---- hints (the main menu): the route's next objective - the first ['obj'] step at or after where the runner
  // would carry on in this game (R.findResume: past the last story guard that holds) - and this map's treasure
  let plan = null;
  Q.objective = function () {
    const R = FF7.runner;
    if (!R || !R.buildPlan || !R.findResume || !FF7.state) return null;
    try {
      if (!plan) { const keep = R.chapterOf; plan = R.buildPlan(R.CHAPTERS); R.chapterOf = keep || R.chapterOf; }
      for (let i = R.findResume(plan); i < plan.length; i++) {
        const s = plan[i]; if (!Array.isArray(s)) continue;
        if (s[0] === 'todo') break;
        if (s[0] === 'obj' && typeof s[1] === 'string') return s[1];
      }
    } catch (e) { console.warn('hint', e); }
    return null;
  };
  // what is still to be picked up on the current field map (its chests and items, as the field shows them)
  Q.treasure = function () {
    const fs = FF7.fieldScene, U = FF7.util;
    if (!fs || !fs.map || FF7.state.loc.mode !== 'field' || !FF7.sceneMgr.stack.includes(fs)) return null;
    const name = (o) => o.materia ? ((FF7.data.materia[o.materia] || {}).name || o.materia) + ' Materia' : o.item ? U.itemName(o.item) : o.gil ? o.gil + ' gil' : '?';
    return (fs.objects || []).filter(o => (o.kind === 'item') || (o.kind === 'chest' && !o.open)).map(name);
  };
})();

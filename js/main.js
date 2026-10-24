// Boot + main loop (fixed 60 Hz update, render every animation frame).
(function () {
  FF7.frame = 0;
  FF7.DEBUG = /[?&]debug/.test(location.search);

  FF7.boot = function () {
    FF7.render.init();
    if (!FF7.GL.init()) {
      const c = FF7.render.ctx;
      FF7.render.clear();
      FF7.render.text('WebGL is required to play.', 320, 220, { align: 'center' });
      return;
    }
    FF7.state = FF7.newState();
    FF7.audio.musicVol = FF7.state.config.musicVol; FF7.audio.sfxVol = FF7.state.config.sfxVol;   // (the shared settings: FF7.prefs)
    if (FF7.dataFixups) FF7.dataFixups();
    // preload portraits
    ['cloud', 'barret', 'tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'sephiroth', 'biggs', 'wedge', 'jessie', 'reno', 'rude', 'elena', 'zack', 'young_barret', 'young_dyne'].forEach(id => FF7.render.loadImage('assets/portraits/' + id + '.png'));
    const q = new URLSearchParams(location.search);
    // dev shortcuts: ?party=cloud,barret,tifa (joins/sets the party first), ?flags=a,b (sets story flags). A test game
    // (FF7.devState) never writes the Autosave over the player's own; a New Game or a loaded file is a new state and
    // autosaves again
    const devSetup = () => {
      FF7.devState = FF7.state;
      if (q.get('party')) { const ids = q.get('party').split(','); ids.forEach(id => FF7.sys.party.join(id)); FF7.sys.party.set(ids.slice(0, 3)); }
      if (q.get('flags')) q.get('flags').split(',').forEach(f => { FF7.state.flags[f] = true; });
    };
    if (q.get('map')) {
      // dev shortcut: ?map=id&entry=name
      FF7.newGame({ skipIntro: true });
      devSetup();
      FF7.field.start(q.get('map'), q.get('entry') || undefined);
    } else if (q.get('battle') || q.get('table')) {
      // ?battle=mp,mp (or ?table=boss_air_buster: a formation from an encounter table) [&type=normal|preempt|
      // back|side|pincer] [&groups=1,1,2: pincer sides] [&shot=side|side_high|diag|behind] [&bg=...]
      FF7.newGame({ skipIntro: true });
      devSetup();
      FF7.field.start(q.get('bmap') || Object.keys(FF7.maps)[0]);
      const bo = q.get('table') ? { table: q.get('table'), bg: q.get('bg') || undefined } : { enemies: q.get('battle').split(','), bg: q.get('bg') || 'grass' };
      if (q.get('type')) bo.type = q.get('type');
      if (q.get('shot')) bo.shot = q.get('shot');
      if (q.get('groups') && bo.enemies) bo.formation = { e: bo.enemies, groups: q.get('groups').split(',').map(Number) };
      FF7.battle.start(bo);
    } else if (q.get('minigame')) {
      // dev shortcut: ?minigame=<id>|menu [&mode=gbike&variant=super_dunk&course=B&forced&final&bot]
      FF7.newGame({ skipIntro: true }); FF7.devState = FF7.state;
      FF7.field.start(q.get('bmap') || Object.keys(FF7.maps)[0]);
      FF7.minigames.debugStart(q.get('minigame'), q);
    } else if (q.get('movie')) {
      // dev shortcut: ?movie=<id>|all  (plays the movie, then a movie list; js/gfx/cinema.js)
      FF7.newGame({ skipIntro: true }); FF7.devState = FF7.state;
      FF7.cinema.test(q.get('movie'));
    } else if (q.get('world')) {
      FF7.newGame({ skipIntro: true }); FF7.devState = FF7.state;
      FF7.world.enter(q.get('world'));
    } else if (q.has('kpdemo') && FF7.kupomon && FF7.kupomon.loadDemo && FF7.kupomon.loadDemo()) {
      // dev shortcut: ?kpdemo (the Kupomon Demo carried on from its own file, as Continue Demo does: the Autosave's game
      // around it, the MogBoy on, the Demo at the step it saved on; a reload after the Demo saves needs nothing more)
      const K = FF7.kupomon, a = FF7.save.read('auto');
      if (a) FF7.loadState(a);
      FF7.sceneMgr.set(new FF7.scenes.Title());
      K.play(); const f = K.loadDemo(); K.enter(null, f.state); K._demoRun = true; K.demo({ at: f.pc, steps: f.steps });
    } else {
      FF7.sceneMgr.set(new FF7.scenes.Title());
    }
    let last = performance.now(), acc = 0; const renderErrs = new Set();
    const STEP = 1000 / 60;
    function loop(now) {
      acc += Math.max(0, Math.min(250, now - last));   // never negative (clock jumps)
      last = now;
      const k = FF7.timeScale > 0 ? FF7.timeScale : 1;   // the Demo's fast-forward (js/runner/demo.js): 2x ... 32x
      // (a time budget per refresh: at 32x a machine that can't step that fast plays as fast as it can and stays
      // smooth; what's left over is dropped, so a slower speed afterwards isn't sped up by a backlog)
      let n = 0; const t0 = performance.now();
      while (acc >= STEP / k && n < 5 * k) {
        try { FF7.stepFrame(); } catch (e) { const m = String(e && e.message); if (!renderErrs.has('step:' + m)) { renderErrs.add('step:' + m); console.error('frame:', e); } }
        acc -= STEP / k; n++;
        if (k > 1 && performance.now() - t0 > 24) { acc = 0; break; }
      }
      if (k > 1 && n >= 5 * k) acc = 0;
      // (a drawing error is logged once and the game goes on: one bad frame mustn't stop the loop for good)
      try {
        FF7.sceneMgr.render();
        if (FF7.qol) FF7.qol.draw();
        if (FF7.DEBUG && FF7.debugOverlay) FF7.debugOverlay();
      } catch (e) { const k = String(e && e.message); if (!renderErrs.has(k)) { renderErrs.add(k); console.error('render:', e); } }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  // One fixed 60 Hz game frame. FF7.beforeFrame (the runner, js/runner/runner.js) feeds its virtual
  // input just before the input update; tools/run_runner.js steps the game with this too.
  FF7.timeScale = 1;
  FF7.stepFrame = function () {
    if (FF7.beforeFrame) FF7.beforeFrame();
    FF7.input.update();
    if (FF7.qol) FF7.qol.frame();   // (fast-forward key, autosave)
    if (FF7.achievements) FF7.achievements.tick();   // (js/systems/achievements.js: about once a second)
    FF7.sceneMgr.update();
    FF7.audio.update();
    tickTime();
    FF7.frame++;
  };

  function tickTime() {
    const st = FF7.state;
    if (!st) return;
    const top = FF7.sceneMgr.top();
    if (!top || top.noClock) return;
    st.time += 1 / 60;
    if (st.timer && !top.isTitle) {
      if (!(top.isBattle && top.paused)) st.timer.t -= 1 / 60;
      if (st.timer.t <= 0 && !st.timer.expired) {
        st.timer.expired = true;
        if (st.timer.onExpire) st.timer.onExpire(); else FF7.scenes.gameOver();
      }
    }
  }

  // Start a new game state (does not start a scene)
  FF7.newGame = function (opts = {}) {
    const keepCfg = FF7.state && FF7.state.config;
    FF7.state = FF7.newState();
    if (keepCfg) FF7.state.config = keepCfg;
    FF7.sys.party.join('cloud');
    FF7.state.party = ['cloud', null, null];
    FF7.state.items = [{ id: 'potion', qty: 2 }, { id: 'phoenix_down', qty: 1 }].filter(e => FF7.data.items[e.id]);
    FF7.state.gil = 0;
    if (FF7.story && FF7.story.newGameSetup) FF7.story.newGameSetup(FF7.state, opts);
    return FF7.state;
  };

  // Continue from a loaded state object
  FF7.loadState = function (st) {
    FF7.state = FF7.save.migrate(st);
    FF7.prefs.apply(FF7.state.config);   // (your settings, not the ones the file was saved with)
    if (FF7.audio.stopAllSfx) FF7.audio.stopAllSfx();   // (nothing from before the load plays on)
    FF7.audio.musicVol = FF7.state.config.musicVol; FF7.audio.sfxVol = FF7.state.config.sfxVol;
    const loc = FF7.state.loc;
    if (loc.mode === 'world') FF7.world.enter({ x: FF7.state.world.x, y: FF7.state.world.y, vehicle: FF7.state.world.vehicle });
    else {
      const fs = FF7.field.start(loc.map, [loc.x, loc.y, loc.dir]);
    }
  };
})();

// Demo mode (docs/RUNNER.md): the runner (js/runner/runner.js) plays the game in real time while the
// keyboard and pad are shut out. The title's "Demo" command starts a new game this way; in any game,
// Esc (the 'demo' button) turns it on - the runner works out where the story stands and carries on
// from there - and Esc during a Demo hands control back right where the game is. ` (the 'ff' button)
// cycles fast-forward 1x / 2x / 4x / 8x / 16x / 32x. A Demo saves into its own real file slot (FF7.save.demoSlot: tagged
// Demo, the first empty slot) at save points, milestones and before bosses; the player's config comes back when it ends.
(function () {
  const R = FF7.runner, U = FF7.util;
  const D = R.demo = { active: false, speed: 1 };
  const SPEEDS = [1, 2, 4, 8, 16, 32];
  D.TRAIN_SPEED = 32;         // training steps (grinding levels, Limit training, Enemy Skill hunts...) always play at 32x (the user, 2026-10-01; 8x before)

  // Esc works in a game (field, world, battle, menus, movies), not on the title or the Game Over screen
  D.canToggle = function () {
    const top = FF7.sceneMgr.top();
    if (FF7.state && FF7.state.kupomon) return !!(top && !(FF7.kupomon.Title && top instanceof FF7.kupomon.Title) && R.plans.kp);   // (inside Kupomon: the Kupomon route, js/runner/plans/plan_kp.js)
    return !!(FF7.state && !(FF7.kupomon && FF7.kupomon.real) && top && !top.isTitle && !R.isGameOver(top) && (R.where() || top.isBattle || top.isMinigame || R.isMovie(top)));   // (not on the MogBoy's title screen)
  };
  // polled every frame (FF7.beforeFrame): the buttons as the last input update saw them
  D.poll = function () {
    const I = FF7.input;
    if (I.pressed('demo')) {
      if (D.active) D.stop('You have control.');
      else if (D.canToggle()) D.start(FF7.state && FF7.state.kupomon ? { resume: true, runner: { chapters: ['kp'] } } : { resume: true });
    } else if (D.active && I.pressed('ff')) {
      D.speed = SPEEDS[(SPEEDS.indexOf(D.speed) + 1) % SPEEDS.length];
      FF7.timeScale = D.speed;
    }
    // training (R.activity: grinding levels or gil, Limit training, fighting for a goal) runs at 32x, with
    // the fastest battle speed and the victory counts skipped (R.training); the story plays at the chosen speed,
    // and so does a boss that turns up in the middle of it (MOG Mk.II's ambush while hunting Cait Sith's parts)
    if (D.active) {
      const top = FF7.sceneMgr.top(), boss = !!(top && top.isBattle && (top.enemies || []).some(e => e.boss));
      // (R.fastForward: whether this activity is grinding levels, the only thing played at 32x; else any activity is)
      const tr = !boss && (R.fastForward ? !!R.fastForward() : !!(R.activity && R.activity())), c = FF7.state && FF7.state.config;
      if (tr !== !!D.training) {
        D.training = tr;
        if (c && R.cfgSaved) { c.battleSpeed = tr ? 1 : R.cfgSaved.battleSpeed; c.battleMsgSpeed = tr ? 1 : R.cfgSaved.battleMsgSpeed; }
      }
      R.training = tr;
      const want = tr ? Math.max(D.speed, D.TRAIN_SPEED) : D.speed;
      if (FF7.timeScale !== want) FF7.timeScale = want;
    }
  };

  // o.resume: carry on from the game in progress (else: from the title, a new game, or the game as it stands
  // with the plan from its first step: a synthetic chapter start); o.runner: more R.start options (chapters,
  // menus, onLog, to, dateTarget...; tools/run_runner.js --demo --start / --load)
  D.start = function (o = {}) {
    if (D.active || !FF7.state) return false;
    D.saved = U.clone(FF7.state.config);
    D.active = true;
    FF7.input.lock(true);
    D.hud = FF7.sceneMgr.addWidget({ modal: false, persistent: true, aboveFade: true, done: false, _keep: true, update() {}, render() { D.draw(); } });
    const ok = R.start(Object.assign({}, o.runner || {}, { mode: 'demo', resume: !!o.resume, onEnd: (status, issue) => D.ended(status, issue) }));
    if (!ok) { D.finish('The demo could not start.'); return false; }
    return true;
  };
  // Esc: the player takes over where the game is
  D.stop = function (msg) { R.stop('taken over'); D.finish(msg); };
  // the runner stopped by itself: the end of the written route, or something it could not do
  D.ended = function (status, issue) {
    let msg = 'The demo has stopped. You have control.';
    if (status === 'incomplete') msg = 'The demo route ends here for now. You have control.';
    else if (status === 'done') msg = 'The demo route is complete. You have control.';
    else if (issue) {   // say why, briefly (the full record is in the console and FF7.runner.issues)
      const why = String(issue.msg || issue.kind).replace(/\s*\(the same failure.*$/, '');
      msg = 'The demo stopped: ' + (why.length > 70 ? why.slice(0, 67) + '...' : why) + ' You have control.';
    }
    if (issue) console.warn('Demo stopped:', issue);
    D.finish(msg);
  };
  D.finish = function (msg) {
    if (!D.active) return;
    D.active = false;
    FF7.input.lock(false);
    FF7.timeScale = 1; D.speed = 1; D.training = false; R.training = false;
    if (D.saved && FF7.state) FF7.state.config = Object.assign(FF7.defaultConfig(), D.saved);
    D.saved = null;
    if (D.hud) D.hud.done = true;
    D.hud = null;
    if (msg && FF7.ui && FF7.ui.notice) FF7.ui.notice(msg, /stopped:/.test(msg) ? 300 : 180);
  };

  // HUD: a thin strip along the bottom edge (below the dialogue boxes)
  D.draw = function () {
    const Rn = FF7.render, c = Rn.ctx;
    if (!c || !D.active) return;
    const W = FF7.W, H = FF7.H, h = 15;
    c.save();
    c.fillStyle = 'rgba(0,0,16,0.62)'; c.fillRect(0, H - h, W, h);
    c.font = Rn.font(11, '700'); c.textBaseline = 'middle'; c.textAlign = 'left';
    const tag = 'DEMO' + (FF7.timeScale > 1 ? ' ' + FF7.timeScale + '×' : '');
    c.fillStyle = '#ffd860'; c.fillText(tag, 6, H - h / 2);
    const x0 = Math.max(58, 6 + c.measureText(tag).width + 12);   // (the status after the tag, however wide the speed makes it: "DEMO 32x" ran into it)
    const keys = 'Esc: take control   `: fast-forward';
    c.font = Rn.font(11, '600'); c.textAlign = 'right'; c.fillStyle = '#9aa4c0'; c.fillText(keys, W - 6, H - h / 2);
    const kw = c.measureText(keys).width;
    const obj = (R.activity && R.activity()) || R.objective || R.chapterTitle || '';   // a training step says so
    if (obj) {
      c.textAlign = 'left'; c.fillStyle = '#e8e8f0';
      let t = obj; const room = W - x0 - 12 - kw - 16;
      while (t.length > 4 && c.measureText(t).width > room) t = t.slice(0, -2);
      if (t !== obj) t = t.replace(/\s*\S*$/, '') + '…';
      c.fillText(t, x0, H - h / 2);
    }
    c.restore();
  };
})();

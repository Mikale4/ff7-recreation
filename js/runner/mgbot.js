// Minigame auto-play, shared by tools/sim.js (minigame mode) and the runner (js/runner/runner.js).
// The bots themselves live in each game (game.bot() -> buttons held this frame);
// MinigameScene.botInput() adds the help / result / retry screens around them.
//   FF7.mgbot.buttons(scene)        -> the buttons the bot holds this frame, in any phase
//   FF7.mgbot.attach(scene, opts)   -> the runner plays it through FF7.input (feeding buttons())
//   FF7.mgbot.run(id, opts, hooks)  -> headless: start a minigame and step it to the end
(function () {
  const MB = FF7.mgbot = {};

  MB.buttons = function (sc) { return sc && sc.botInput ? (sc.botInput() || []) : []; };

  // The scene reads FF7.input instead of its own virtual pad; the runner holds MB.buttons(sc) there
  // every frame. opts.retry: answer "retry" on a lost game's retry question (the bot says no by default).
  MB.attach = function (sc, opts = {}) {
    sc.bot = false;
    sc.I = FF7.input;
    sc.botRetry = !!opts.retry;
    sc._runner = true;
  };

  // Headless: start minigame `id` with the auto-play bot on its virtual pad (FF7.minigames.autoplay) and
  // step it until it ends. hooks: { frame() one game frame, maxFrames, onFrame(n, scene) after each frame }.
  // Returns { w (the minigame's waitable), n (frames), timeline (phase changes) }.
  MB.run = function (id, opts, hooks = {}) {
    const MG = FF7.minigames;
    const w = MG.start(id, opts);
    const maxF = hooks.maxFrames || 20000;
    const timeline = [];
    const scene = () => FF7.sceneMgr.stack.find(s => s.isMinigame);
    let n = 0, lastPhase = '';
    while (!w.done && n < maxF) {
      hooks.frame();
      const sc = scene();
      if (sc && sc.phase !== lastPhase) { timeline.push(`${sc.phase}@${n}`); lastPhase = sc.phase; }
      if (hooks.onFrame) hooks.onFrame(n, sc);
      n++;
    }
    return { w, n, timeline };
  };
})();

// Scene stack + UI overlay layer + screen fader/shake/transition effects.
(function () {
  const U = FF7.util, R = FF7.render;

  const S = FF7.sceneMgr = {
    stack: [],
    layer: [],      // UI widgets drawn above the scene (text boxes, choices, banners...)
    fader: { alpha: 0, target: 0, step: 0, color: '#000' },
    shake: { mag: 0, frames: 0 },
    flash: { color: '#fff', alpha: 0, step: 0 },
    transition: null,
  };

  S.top = () => S.stack[S.stack.length - 1];
  S.set = function (scene) {
    while (S.stack.length) { const s = S.stack.pop(); s.exit && s.exit(); }
    S.layer = S.layer.filter(w => w.persistent);
    S.stack.push(scene);
    scene.enter && scene.enter();
    FF7.input.consume();
  };
  S.push = function (scene) {
    const prev = S.top();
    prev && prev.pause && prev.pause();
    S.stack.push(scene);
    scene.enter && scene.enter();
    FF7.input.consume();
  };
  S.pop = function () {
    const s = S.stack.pop();
    s && s.exit && s.exit();
    const top = S.top();
    top && top.resume && top.resume();
    FF7.input.consume();
    return s;
  };
  S.replace = function (scene) {
    const s = S.stack.pop();
    s && s.exit && s.exit();
    S.stack.push(scene);
    scene.enter && scene.enter();
    FF7.input.consume();
  };

  // ---- UI layer ----
  // Run a coroutine that survives scene changes (transitions: fade out -> switch scene -> fade in)
  S.run = function (gen) {
    const co = new FF7.Coroutine(gen, { name: 'sceneMgr.run' });
    S.addWidget({ persistent: true, done: false, update() { co.update(); if (co.done) this.done = true; }, render() {} });
    return co;
  };
  S.addWidget = function (w) { w._owned = true; S.layer.push(w); return w; };
  S.hasModal = () => S.layer.some(w => w.modal && !w.done);
  S.removeWidget = (w) => { const i = S.layer.indexOf(w); if (i >= 0) S.layer.splice(i, 1); };

  // ---- Fader: waitables ----
  S.fadeOut = function (frames = 20, color = '#000') {
    const f = S.fader;
    f.color = color; f.target = 1; f.step = frames > 0 ? 1 / frames : 1;
    if (frames <= 0) f.alpha = 1;
    return { get done() { return f.alpha >= 1; } };
  };
  S.fadeIn = function (frames = 20) {
    const f = S.fader;
    f.target = 0; f.step = frames > 0 ? 1 / frames : 1;
    if (frames <= 0) f.alpha = 0;
    return { get done() { return f.alpha <= 0; } };
  };
  S.doShake = function (mag = 4, frames = 20) { S.shake.mag = mag; S.shake.frames = frames; };
  S.doFlash = function (color = '#fff', frames = 12, strength = 1) { S.flash.color = color; S.flash.alpha = strength; S.flash.step = strength / Math.max(1, frames); };

  // Battle swirl: snapshot the screen and spin/zoom it away.
  S.swirl = function (frames = 50) {
    const snap = U.makeCanvas(FF7.W, FF7.H);
    // (a canvas with no size - the window minimised or hidden as a battle starts - can't be copied: a blank swirl then)
    if (R.canvas && R.canvas.width > 0 && R.canvas.height > 0) snap.getContext('2d').drawImage(R.canvas, 0, 0, FF7.W, FF7.H);
    const t = { snap, t: 0, n: frames, done: false };
    S.transition = t;
    return t;
  };

  S.update = function () {
    const top = S.top();
    const modal = S.hasModal();
    // topmost modal widget gets input
    let focusGiven = false;
    for (let i = S.layer.length - 1; i >= 0; i--) {
      const w = S.layer[i];
      if (w.done) continue;
      const focus = w.modal && !focusGiven;
      if (focus) focusGiven = true;
      w.update && w.update(focus || !w.modal);
    }
    S.layer = S.layer.filter(w => !w.done);
    if (top && !S.transition) top.update(!modal);
    // fader
    const f = S.fader;
    if (f.alpha < f.target) f.alpha = Math.min(f.target, f.alpha + f.step);
    else if (f.alpha > f.target) f.alpha = Math.max(f.target, f.alpha - f.step);
    if (S.shake.frames > 0) S.shake.frames--;
    if (S.flash.alpha > 0) S.flash.alpha = Math.max(0, S.flash.alpha - S.flash.step);
    if (S.transition) { S.transition.t++; if (S.transition.t >= S.transition.n) { S.transition.done = true; S.transition = null; } }
  };

  S.render = function () {
    const c = R.ctx;
    R.reset();
    R.clear();
    c.save();
    if (S.shake.frames > 0) {
      const m = S.shake.mag * Math.min(1, S.shake.frames / 10);
      c.translate(Math.round((Math.random() * 2 - 1) * m), Math.round((Math.random() * 2 - 1) * m));
    }
    if (S.transition) {
      const t = S.transition, p = t.t / t.n;
      c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      c.save();
      c.translate(FF7.W / 2, FF7.H / 2);
      for (let k = 3; k >= 0; k--) {
        c.save();
        c.globalAlpha = (1 - p) * (k === 0 ? 1 : 0.35);
        c.rotate(p * p * 6 + k * 0.15 * p);
        const z = 1 + p * p * 3 + k * 0.08;
        c.scale(z, z);
        c.drawImage(t.snap, -FF7.W / 2, -FF7.H / 2);
        c.restore();
      }
      c.restore();
      c.globalAlpha = Math.min(1, p * 1.2);
      c.fillStyle = '#fff'; c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.max(0, Math.sin(p * Math.PI)) * 0.35; c.fillRect(0, 0, FF7.W, FF7.H);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    } else {
      // render scenes: a transparent scene shows the one beneath it
      let start = S.stack.length - 1;
      while (start > 0 && S.stack[start].transparent) start--;
      for (let i = start; i < S.stack.length; i++) { R.reset(); S.stack[i].render(); }
    }
    c.restore();
    R.reset();
    for (const w of S.layer) if (!w.aboveFade && w.render) { w.render(); R.reset(); }
    if (S.flash.alpha > 0) R.fill(S.flash.color, S.flash.alpha);
    if (S.fader.alpha > 0) R.fill(S.fader.color, S.fader.alpha);
    for (const w of S.layer) if (w.aboveFade && w.render) { w.render(); R.reset(); }
  };
})();

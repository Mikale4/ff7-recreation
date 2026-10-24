// Dev tool: renders the menu portraits (assets/portraits/<id>.png, 128x128) from the game's own low-poly battle
// models, so every portrait matches the 3D cast (none come from the reference art). Run in the browser, in the game
// page served by tools/portrait_sink.py (http://localhost:8778/: it takes the POSTs on the same origin):
//     eval(await (await fetch('/tools/render_portraits.js')).text()); await FF7.renderPortraits()
// FF7.renderPortraits(ids?, { dry: true }) returns data URLs instead of saving. Per-character framing: FRAME below.
(function () {
  const IDS = ['cloud', 'barret', 'tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'sephiroth', 'biggs', 'wedge', 'jessie', 'reno', 'rude', 'elena', 'zack', 'young_barret', 'young_dyne'];
  // framing: dist (camera to the head), up (look point above the head bone), side (camera off to the model's left,
  // a share of dist: a 3/4 view), bone (the head bone), rotY (turn the model), crop (share of the frame height kept)
  const FRAME = {
    default: { dist: 0.95, up: 0.085, side: 0.3, crop: 0.6 },
    cloud: { dist: 1.02, up: 0.13 },                     // (the spikes)
    barret: { dist: 1.2, up: 0.1 },                      // (the biggest model)
    young_barret: { dist: 1.2, up: 0.1 },
    redxiii: { dist: 0.9, up: 0.02, side: 0.6, crop: 0.62 },
    caitsith: { at: [0, 1.19, 0], dist: 0.8, side: 0.3, crop: 0.6 },   // (the cat on the Moogle: no bone of its own)
  };
  function shot(id) {
    const GL = FF7.GL, C3 = FF7.chars3d, f = Object.assign({}, FRAME.default, FRAME[id] || {});
    const m = C3.build(id, { style: 'battle' });
    m.position = [0, 0, 0]; m.rotY = f.rotY || 0; m.scale = 1;
    if (m.showWeapon) m.showWeapon(false);
    if (m.anims) m.play(m.anims.idle);
    m.update(1); m.computeWorld();
    const hb = f.bone || 'head';
    const head = f.at ? f.at.slice() : m.bones[hb] ? m.worldPoint(hb, [0, f.up || 0, 0]) : [0, (m.height || 1) * 0.88, 0];
    GL.begin({ clear: [0.06, 0.09, 0.22, 1], light: { dir: [-0.45, -0.55, -0.7], color: [0.9, 0.86, 0.8], dir2: [0.7, 0.05, -0.4], color2: [0.28, 0.32, 0.5], ambient: [0.4, 0.4, 0.47] } });
    GL.camera([head[0] + f.side * f.dist, head[1] + 0.03, head[2] + f.dist], head, 26, 0.02, 50);
    m.draw();
    const W = GL.canvas.width, H = GL.canvas.height, S = Math.round(H * f.crop);
    const out = document.createElement('canvas'); out.width = 128; out.height = 128;
    const c = out.getContext('2d');
    // a soft top-lit backdrop behind the model (the GL clear colour stays where nothing is drawn)
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(GL.canvas, Math.round((W - S) / 2), Math.round((H - S) / 2), S, S, 0, 0, 128, 128);
    const g = c.createRadialGradient(64, 40, 10, 64, 64, 96); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return out;
  }
  FF7.renderPortraits = async function (ids = IDS, o = {}) {
    const res = {};
    for (const id of ids) {
      const cv = shot(id);
      if (o.dry) { res[id] = cv.toDataURL('image/png'); continue; }
      // (toDataURL, not toBlob: toBlob's callback never comes in a hidden tab)
      const b64 = atob(cv.toDataURL('image/png').split(',')[1]), blob = new Uint8Array(b64.length);
      for (let i = 0; i < b64.length; i++) blob[i] = b64.charCodeAt(i);
      const name = (o.prefix || '') + id;
      const rsp = await fetch('/save?name=' + name, { method: 'POST', body: blob });
      res[id] = rsp.ok ? 'saved ' + name : 'failed ' + rsp.status;
      if (FF7.render.images) delete FF7.render.images['assets/portraits/' + id + '.png'];   // (reloaded on next use)
    }
    return res;
  };
  FF7.renderPortraits.FRAME = FRAME;
})();

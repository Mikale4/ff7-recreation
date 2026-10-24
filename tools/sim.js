// Headless engine harness: runs the real game code with rendering stubbed, for automated tests.
//   node tools/sim.js battle mp,guard_hound [--party cloud,barret] [--level 10] [--frames 20000] [--summon shiva] [--weapon murasame]
//                    [--parties cloud,tifa,barret/redxiii,cid/yuffie]   (a split-party battle: when one falls the next takes over)
//   node tools/sim.js map md1_platform            (loads a field map and runs its onEnter script)
//   node tools/sim.js minigame <id>|all [--mode gbike ...] [--shot N --out file.png]   (auto-play bot, see below)
//   node tools/sim.js eval "<js expression>"      (debug: evaluate with the game loaded)
//   node tools/sim.js movie <id>|all [--skip N]   (plays a real-time cinematic to completion, reports frames/errors)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

// the game, loaded headless (tools/sim_prelude.js, shared with tools/run_runner.js)
const { FF7, ctx2d, el } = require('./sim_prelude').boot();
const noop = () => {};
const input = FF7.input;
const press = (b) => { input.update = function () {}; };

function frame() { FF7.sceneMgr.update(); FF7.frame++; }

const mode = argv[0] || 'battle';
if (mode === 'battle') {
  const enemies = (argv[1] || 'mp,mp').split(',');
  const parties = opt('parties', null) ? opt('parties').split('/').map(g => g.split(',')) : null;
  const party = parties ? parties[0] : (opt('party', 'cloud,barret,tifa')).split(',');
  if (parties) parties.slice(1).flat().forEach(id => { FF7.sys.party.join(id, { toParty: false }); FF7.sys.stats.autoLevel(FF7.state.chars[id], +opt('level', 10)); });
  const lvl = +opt('level', 10);
  party.forEach(id => FF7.sys.party.join(id));
  FF7.state.party = party.concat([null, null, null]).slice(0, 3);
  party.forEach(id => { const c = FF7.state.chars[id]; FF7.sys.stats.autoLevel(c, lvl); });
  const wid = opt('weapon', null);   // --weapon: equip it on its owner (or the first member)
  if (wid) { const wd = FF7.data.weapons[wid]; FF7.state.chars[wd && party.includes(wd.char) ? wd.char : party[0]].weapon = wid; }
  FF7.state.items = [{ id: 'potion', qty: 5 }, { id: 'phoenix_down', qty: 3 }];
  FF7.field.start('dev_test');
  const w = FF7.battle.start({ enemies, bg: 'reactor', parties });
  const bs = FF7.sceneMgr.top();
  console.log('battle models:', bs.party.map(p => `${p.name} ${p.char.weapon} -> ${p.model.app.weapon} (${p.model.weaponMesh ? p.model.weaponMesh.count / 3 : 0} tris)`).join(' | '));
  let n = 0; const maxF = +opt('frames', 30000);
  const log = [];
  const origBanner = bs.banner.bind(bs);
  const sumId = opt('summon', null); let sumDone = false;
  while (!w.done && n < maxF) {
    // auto-play: when a menu is open, pick Attack/Magic/Limit on the first enemy
    if (bs.menu && bs.menu.open && bs.menu.state === 'command') {
      const a = bs.menu.actor;
      const cmds = bs.menu.commands();
      let act;
      if (sumId && !sumDone) { sumDone = true; act = { type: 'summon', id: sumId, all: true, side: 'enemy', free: true }; log.push(`${a.name} SUMMON ${sumId}`); }   // --summon: cast it once
      else if (cmds.includes('limit')) { const lim = a.char.limitsKnown[0]; act = { type: 'limit', id: lim, side: 'enemy', targets: [bs.enemies.find(e => e.targetable)] }; log.push(`${a.name} LIMIT ${lim}`); }
      else if (a.abilities.spells.length && a.mp >= 10 && Math.random() < 0.4) { const sp = a.abilities.spells[0].id; act = { type: 'magic', id: sp, side: FF7.data.spells[sp].target === 'ally' ? 'ally' : 'enemy', targets: [FF7.data.spells[sp].target === 'ally' ? a : bs.enemies.find(e => e.targetable)] }; log.push(`${a.name} casts ${sp}`); }
      else { act = { type: 'attack', side: 'enemy', targets: [bs.enemies.find(e => e.targetable)] }; }
      bs.menu.submit(act);
    }
    if (bs.phase === 'victory' && bs.victory && bs.victory.t > 45) { bs.victory.page++; bs.victory.t = 30; if (bs.victory.page >= bs.victory.pages.length) bs.finish('win'); }
    frame(); n++;
    if (parties && bs.partyNo !== bs._seenNo) { bs._seenNo = bs.partyNo; log.push(`t=${n} PARTY ${bs.partyNo || 1} on the field: ${bs.party.map(p => p.name).join(', ')}`); }
    if (n % 600 === 0) log.push(`t=${n} party ${bs.party.map(p => p.name + ':' + p.hp + '/' + p.maxHp + (p.limitGauge >= 255 ? '(L)' : '')).join(' ')} | enemies ${bs.enemies.map(e => e.name + ':' + e.hp + (e.hidden ? '(gone)' : '')).join(' ')}`);
  }
  console.log(log.slice(-25).join('\n'));
  console.log('result:', w.result, 'frames:', n, 'phase:', bs.phase);
  if (bs.victory) console.log('victory:', { exp: bs.victory.exp, ap: bs.victory.ap, gil: bs.victory.gil, items: bs.victory.items, notices: bs.victory.notices });
  console.log('party after:', FF7.state.party.filter(Boolean).map(id => { const c = FF7.state.chars[id]; return `${c.name} L${c.level} ${c.hp}/${c.maxHp} xp ${c.xp}`; }).join(' | '));
} else if (mode === 'map') {
  const id = argv[1];
  FF7.field.start(id, opt('entry', undefined));
  let n = 0; const fs2 = FF7.fieldScene;
  // auto-advance dialogs
  while (n < +opt('frames', 6000)) {
    const top = FF7.sceneMgr.layer.find(w => w.modal && !w.done);
    if (top && n % 3 === 0) { if (top.choices) { top.result = 0; top.done = true; } else { top.done = true; top.result = 0; } }
    if (FF7.sceneMgr.top() && FF7.sceneMgr.top().isBattle) { const b = FF7.sceneMgr.top(); b.enemies.forEach(e => { e.hp = 0; e.kill(); }); }
    frame(); n++;
  }
  console.log('map now:', FF7.fieldScene && FF7.fieldScene.map && FF7.fieldScene.map.id, 'flags:', Object.keys(FF7.state.flags).length, 'script running:', !!(FF7.fieldScene && FF7.fieldScene.script));
}

// ---------------------------------------------------------------- eval (debugging): node tools/sim.js eval "FF7.minigames.list.length"
if (mode === 'eval') { const r = eval(argv[1]); console.log(typeof r === 'object' ? JSON.stringify(r, null, 1) : r); }

// ---------------------------------------------------------------- minigames
//   node tools/sim.js minigame <id> [--mode gbike] [--variant super_dunk] [--course B] [--forced] [--final]
//        [--level N] [--battle N] [--gil N] [--opts '{"k":v}'] [--frames 20000] [--nobot]
//        [--shot 300,900] [--out previews/mg.png]   (software-rendered 3D snapshots of those frames)
//   node tools/sim.js minigame all                  (runs every registered minigame + variants)
if (mode === 'minigame') {
  const MG = FF7.minigames;
  const snap = makeSnap();
  const runOne = (id, mopts, label) => {
    if (FF7.maps.dev_test) FF7.field.start('dev_test');
    MG.autoplay = !argv.includes('--nobot');
    const shots = (opt('shot', '') || '').split(',').filter(Boolean).map(Number);
    const outBase = opt('out', path.join(ROOT, 'previews', 'mg_' + id + '.png'));
    const t0 = Date.now();
    let renderErrors = 0;
    // the bot plays to the end (js/runner/mgbot.js, shared with the runner)
    const { w, n, timeline } = FF7.mgbot.run(id, mopts, { frame, maxFrames: +opt('frames', 20000), onFrame(n, sc) {
      const shoot = shots.includes(n);
      if (shoot) snap.begin();
      if (n % 3 === 0 || shoot) { try { FF7.sceneMgr.render(); } catch (e) { if (renderErrors++ < 3) console.error('RENDER ERROR', e.stack); } }
      if (shoot) snap.end(shots.length > 1 ? outBase.replace(/\.png$/, '_' + n + '.png') : outBase);
      if (sc && sc.game && sc.game.debugLog && n % 600 === 0 && argv.includes('--log')) console.log(`t=${n}`, sc.game.debugLog());
    } });
    if (!argv.includes('--quiet')) console.log('timeline:', timeline.join(' '));
    console.log(`${label || id}: result ${JSON.stringify(w.result)} frames ${n} done ${w.done} (${Date.now() - t0} ms)`);
    if (!w.done || n >= 20000 || (w.result && w.result.error)) process.exitCode = 1;
    // clear any leftover scenes
    while (FF7.sceneMgr.stack.length) FF7.sceneMgr.pop();
    FF7.sceneMgr.fader.alpha = 0; FF7.sceneMgr.fader.target = 0;
    return w;
  };
  if (argv[1] === 'all') {
    MG.list.forEach(e => runOne(e.id, Object.assign({}, MG.debugDefaults[e.id]), e.id));
    MG.variants.forEach(v => runOne(v.id, Object.assign({}, v.opts), v.id + ' ' + JSON.stringify(v.opts)));
  } else {
    const id = argv[1];
    const mopts = Object.assign({}, MG.debugDefaults[id], opt('opts', null) ? JSON.parse(opt('opts')) : {});
    ['mode', 'variant', 'course', 'level', 'battle', 'rank', 'gil', 'route', 'title'].forEach(k => { const v = opt(k, null); if (v != null) mopts[k] = isNaN(+v) ? v : +v; });
    ['forced', 'final', 'retry'].forEach(k => { if (argv.includes('--' + k)) mopts[k] = true; });
    runOne(id, mopts);
  }
}

// ---------------------------------------------------------------- movies (js/gfx/cinema.js)
//   node tools/sim.js movie <id>[,<id>...]|all [--text "caption"] [--frames 20000] [--skip N]
//   Plays the real-time cinematic (bypassing the original-FMV video wrapper) to completion and reports
//   frames, duration and errors. --skip N presses Start at frame N, then OK on the Skip prompt's Yes.
if (mode === 'movie') {
  const C = FF7.cinema;
  const ids = !argv[1] || argv[1] === 'all' ? C.list.slice() : argv[1].split(',');
  let bad = 0;
  for (const id of ids) {
    const errs = [], oErr = console.error, oWarn = console.warn;
    console.error = console.warn = (...a) => errs.push(a.map(x => x && x.stack ? x.stack.split('\n').slice(0, 2).join(' | ') : String(x)).join(' '));
    const t0 = Date.now();
    FF7.sceneMgr.set({ update() {}, render() {} });
    const w = (C.playRealtime || C.play)(id, { text: opt('text', 'A test caption for the movie.\nSecond line of the caption.') });
    const maxF = +opt('frames', 20000), skipAt = opt('skip', null) != null ? +opt('skip') : -1;
    let n = 0, renders = 0;
    const pressed = FF7.input.pressed;
    while (!w.done && n < maxF) {
      FF7.input.pressed = n === skipAt ? (b) => b === 'start' || pressed.call(FF7.input, b) : n === skipAt + 5 ? (b) => b === 'ok' || pressed.call(FF7.input, b) : pressed;
      frame();
      if (n % 4 === 0) { try { FF7.sceneMgr.render(); renders++; } catch (e) { errs.push('RENDER ' + e.stack.split('\n').slice(0, 2).join(' | ')); } }
      n++;
    }
    FF7.input.pressed = pressed;
    console.error = oErr; console.warn = oWarn;
    if (!w.done || errs.length) bad++;
    console.log(`${id}: ${w.done ? 'done (' + w.result + ')' : 'NOT DONE'} after ${n} frames (${(n / 60).toFixed(1)} s), ${renders} renders, ${errs.length} error(s), ${Date.now() - t0} ms`);
    errs.slice(0, 6).forEach(e => console.log('    ' + e));
    FF7.sceneMgr.fader.alpha = 0; FF7.sceneMgr.fader.target = 0;
  }
  if (bad) process.exitCode = 1;
}

// Software snapshot of GL draws for one frame (3D only; the 2D HUD is not rasterised, except the
// FF7.minigames.sky() gradient top colour used as the background).
function makeSnap() {
  const M4 = FF7.M4, GL = FF7.GL, SW = 320, SH = 240;
  let img, zb, light, saved = {};
  const vp = M4.create();
  const bg = [0.05, 0.05, 0.2];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  function clear(col) { for (let i = 0; i < SW * SH; i++) { const k = Math.floor(i / SW) / SH; img[i * 3] = col[0] * (1 - k * 0.3); img[i * 3 + 1] = col[1] * (1 - k * 0.3); img[i * 3 + 2] = col[2] * (1 - k * 0.2); } }
  // clip against w > NEAR in clip space, then rasterise the resulting fan
  const NEAR = 0.1;
  function tri(v, cull, blend) {
    const cl = v.map(p => { const x = p.p[0], y = p.p[1], z = p.p[2]; return { x: vp[0] * x + vp[4] * y + vp[8] * z + vp[12], y: vp[1] * x + vp[5] * y + vp[9] * z + vp[13], w: vp[3] * x + vp[7] * y + vp[11] * z + vp[15], c: p.c }; });
    if (cl.every(q => q.w > NEAR)) return raster(cl, cull, blend);
    if (cl.every(q => q.w <= NEAR)) return;
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = cl[i], b = cl[(i + 1) % 3], ain = a.w > NEAR, bin = b.w > NEAR;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (NEAR - a.w) / (b.w - a.w); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: NEAR, c: a.c.map((c, k) => c + (b.c[k] - c) * t) }); }
    }
    for (let i = 1; i + 1 < out.length; i++) raster([out[0], out[i], out[i + 1]], cull, blend);
  }
  function raster(cv, cull, blend) {
    const v = cv;
    const s = cv.map(q => [(q.x / q.w * 0.5 + 0.5) * SW, (1 - (q.y / q.w * 0.5 + 0.5)) * SH, q.w]);
    const area = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
    if ((cull && area >= 0) || Math.abs(area) < 1e-6) return;
    const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), x1 = Math.min(SW - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), y1 = Math.min(SH - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((s[1][0] - px) * (s[2][1] - py) - (s[2][0] - px) * (s[1][1] - py)) / area;
      const w1 = ((s[2][0] - px) * (s[0][1] - py) - (s[0][0] - px) * (s[2][1] - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * s[0][2] + w1 * s[1][2] + w2 * s[2][2], idx = y * SW + x;
      if (z >= zb[idx]) continue;
      const a = blend ? (w0 * v[0].c[3] + w1 * v[1].c[3] + w2 * v[2].c[3]) : 1;
      if (!blend) zb[idx] = z;
      for (let k = 0; k < 3; k++) img[idx * 3 + k] = img[idx * 3 + k] * (1 - a) + Math.min(1, w0 * v[0].c[k] + w1 * v[1].c[k] + w2 * v[2].c[k]) * a;
    }
  }
  function draw(mesh, model, opts = {}) {
    if (!mesh || !mesh.count) return;
    const m = model || M4.create(), unlit = opts.unlit || mesh.unlit, tint = opts.tint || [1, 1, 1, 1], add = opts.add || [0, 0, 0];
    const L = light, verts = [];
    for (let i = 0; i < mesh.count; i++) {
      const x = mesh.pos[i * 3], y = mesh.pos[i * 3 + 1], z = mesh.pos[i * 3 + 2];
      const p = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
      const nx = mesh.nrm[i * 3], ny = mesh.nrm[i * 3 + 1], nz = mesh.nrm[i * 3 + 2];
      const n = norm([m[0] * nx + m[4] * ny + m[8] * nz, m[1] * nx + m[5] * ny + m[9] * nz, m[2] * nx + m[6] * ny + m[10] * nz]);
      let lit = [1, 1, 1];
      if (!unlit) { const d1 = Math.max(0, -(n[0] * L.d1[0] + n[1] * L.d1[1] + n[2] * L.d1[2])), d2 = Math.max(0, -(n[0] * L.d2[0] + n[1] * L.d2[1] + n[2] * L.d2[2])); lit = [0, 1, 2].map(k => L.amb[k] + L.c1[k] * d1 + L.c2[k] * d2); }
      verts.push({ p, c: [0, 1, 2].map(k => mesh.col[i * 4 + k] * lit[k] * tint[k] + add[k]).concat([mesh.col[i * 4 + 3] * tint[3]]) });
    }
    const cull = !(opts.cull === false || mesh.cull === false), blend = !!(opts.blend || mesh.blend);
    for (let i = 0; i + 2 < verts.length; i += 3) tri([verts[i], verts[i + 1], verts[i + 2]], cull, blend);
  }
  const hex = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  return {
    begin() {
      img = new Float32Array(SW * SH * 3); zb = new Float32Array(SW * SH).fill(1e9); clear(bg);
      light = { d1: norm([-0.4, -0.8, -0.5]), d2: norm([0.6, -0.2, 0.7]), c1: [0.75, 0.72, 0.68], c2: [0.18, 0.2, 0.28], amb: [0.38, 0.38, 0.42] };
      saved = { begin: GL.begin, camera: GL.camera, draw: GL.draw, sky: FF7.minigames.sky };
      GL.begin = (o = {}) => { const Lo = o.light || {}; light = { d1: norm(Lo.dir || [-0.4, -0.8, -0.5]), d2: norm(Lo.dir2 || [0.6, -0.2, 0.7]), c1: Lo.color || [0.75, 0.72, 0.68], c2: Lo.color2 || [0.18, 0.2, 0.28], amb: Lo.ambient || [0.38, 0.38, 0.42] }; zb.fill(1e9); if (o.clear && o.clear[3] !== 0) clear(o.clear); };
      GL.camera = (eye, target, fov = 45, near = 0.1, far = 500, up) => { const V = M4.lookAt(M4.create(), eye, target, up || [0, 1, 0]); const P = M4.perspective(M4.create(), fov * Math.PI / 180, 640 / 480, near, far); M4.mul(vp, P, V); };
      GL.draw = draw;
      FF7.minigames.sky = function (top) { if (/^#/.test(top)) clear(hex(top)); };
    },
    end(file) {
      Object.assign(GL, { begin: saved.begin, camera: saved.camera, draw: saved.draw }); FF7.minigames.sky = saved.sky;
      const zlib = require('zlib');
      const raw = Buffer.alloc((SW * 3 + 1) * SH);
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW * 3; x++) raw[y * (SW * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(img[y * SW * 3 + x] * 255)));
      const crcT = []; for (let k = 0; k < 256; k++) { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[k] = c >>> 0; }
      const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
      const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
      const ih = Buffer.alloc(13); ih.writeUInt32BE(SW, 0); ih.writeUInt32BE(SH, 4); ih[8] = 8; ih[9] = 2;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
      console.log('snapshot', file);
    },
  };
}

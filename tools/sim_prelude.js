// Headless prelude shared by tools/sim.js and tools/run_runner.js: loads the real game code (every file
// js/loader.js lists, then the map files) into a vm sandbox with the browser APIs stubbed, then stubs the
// renderer, GL and audio. boot() -> { FF7, sandbox, ctx2d, el, load, ROOT }
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

function boot() {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: (t, k) => k === 'measureText' ? (s) => ({ width: String(s).length * 8 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(16) }) : k === 'getTransform' ? () => ({ a: 1 }) : noop, set: () => true });
  const el = () => ({ getContext: () => ctx2d, style: {}, width: 640, height: 480, addEventListener: noop, appendChild: noop, click: noop });
  const sandbox = { console, Math, JSON, Date, Array, Object, String, Number, Boolean, Set, Map, WeakMap, Proxy, Promise, Symbol, Error, Float32Array, Uint8Array, Uint8ClampedArray, Int32Array,
    parseInt, parseFloat, isFinite, isNaN, setTimeout: (f) => f(), clearTimeout: noop, requestAnimationFrame: noop, performance: { now: () => 0 }, navigator: { getGamepads: () => [] },
    location: { search: '', protocol: 'file:' }, localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop, innerWidth: 640, innerHeight: 480, devicePixelRatio: 1,
    document: { createElement: el, getElementById: el, body: { appendChild: noop } }, Image: function () {}, Audio: function () { this.play = () => Promise.resolve(); this.pause = noop; } };
  sandbox.window = sandbox; vm.createContext(sandbox);
  const loader = fs.readFileSync(path.join(ROOT, 'js/loader.js'), 'utf8');
  const list = (n) => { const m = loader.match(new RegExp('var ' + n + ' = \\[([\\s\\S]*?)\\];')); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []; };
  const load = (f) => { const p = path.isAbsolute(f) ? f : path.join(ROOT, f); if (fs.existsSync(p)) { try { vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f }); } catch (e) { console.error('LOAD', f, e.message); } } };
  load('js/core/namespace.js');
  list('CORE').forEach(load); list('DATA').forEach(load);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/maps/_maps.js'), 'utf8'), sandbox);
  (sandbox.FF7_MAP_FILES || []).forEach(f => load('js/maps/' + f));
  load('js/main.js');
  const FF7 = sandbox.FF7;
  // stub renderer & GL
  FF7.render.canvas = el(); FF7.render.ctx = ctx2d; FF7.render.scale = 1;
  Object.assign(FF7.GL, { ok: true, begin: noop, end: noop, draw: noop, camera: noop, project: () => ({ x: 320, y: 240, visible: true, depth: 5 }), texture: noop, release: noop });
  FF7.audio.unlocked = true; FF7.audio.sfx = noop; FF7.audio.play = function (id) { this.currentId = id; }; FF7.audio.stop = function () { this.currentId = null; }; FF7.audio.push = noop; FF7.audio.pop = noop;
  FF7.state = FF7.newState();
  FF7.newGame({});
  return { FF7, sandbox, ctx2d, el, load, ROOT };
}

module.exports = { boot, ROOT };

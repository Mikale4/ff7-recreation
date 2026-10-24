// Keyboard + gamepad input, mapped to PlayStation-style logical buttons. The defaults (every one can be rebound
// in Config > Controls: two keys and one gamepad button per button, kept per browser in localStorage):
//   ok (Circle)      : Z, Space                 | pad A        confirm / talk
//   cancel (X)       : X, Backspace             | pad B        cancel
//   menu (Triangle)  : Enter                    | pad Y        party menu (open / close); confirms a name
//   run              : C, Shift                 | (hold with the arrows; Config > Run makes it always-run)
//   demo             : Esc                      |              Demo mode on / off (the runner plays)
//   flee             : Q (hold, in battle)      | L1+R1 held
//   auto             : W (in battle)            | pad Back     Auto battle on / off
//   square           : D                        | pad X        extra action (target All, Remove all...)
//   l1 / r1          : A, PageUp / S, PageDown  | LB / RB      switch character / page; world camera
//   l2 / r2          : 1 / 2                    | LT / RT
//   start            : Tab                      | pad Start    pause, skip a movie
//   select           : M                        | pad Back     exit markers, world minimap
//   ff               : ` (backquote)            |              fast-forward
// (F2, the debug menu, is fixed.) A key or pad button belongs to one button at a time: binding it elsewhere moves it
// (the other button gets this slot's old key back, so nothing is left without one).
(function () {
  const BUTTONS = ['up', 'down', 'left', 'right', 'ok', 'cancel', 'menu', 'square', 'l1', 'r1', 'l2', 'r2', 'start', 'select', 'run', 'debug', 'demo', 'flee', 'auto', 'ff'];
  // the rebindable buttons, in the Controls tab's order, with what they do
  const BINDABLE = [
    ['up', 'Up'], ['down', 'Down'], ['left', 'Left'], ['right', 'Right'],
    ['ok', 'OK / talk / examine'], ['cancel', 'Cancel'], ['menu', 'Menu'], ['square', 'Square (All target, extra)'],
    ['run', 'Run (walk: Run Always)'], ['l1', 'L1 (prev. character, page)'], ['r1', 'R1 (next character, page)'],
    ['l2', 'L2 (minigames)'], ['r2', 'R2 (minigames)'], ['start', 'Start (pause, skip movie)'], ['select', 'Select (exits, map size)'],
    ['flee', 'Run away (battle, hold)'], ['auto', 'Auto battle'], ['ff', 'Fast-forward'], ['demo', 'Demo on / off'],
  ];
  const DEFAULT_KEYS = {
    up: ['ArrowUp', 'Numpad8'], down: ['ArrowDown', 'Numpad2'], left: ['ArrowLeft', 'Numpad4'], right: ['ArrowRight', 'Numpad6'],
    ok: ['KeyZ', 'Space'], cancel: ['KeyX', 'Backspace'], menu: ['Enter', null], square: ['KeyD', null],
    run: ['KeyC', 'ShiftLeft'], l1: ['KeyA', 'PageUp'], r1: ['KeyS', 'PageDown'], l2: ['Digit1', null], r2: ['Digit2', null],
    start: ['Tab', null], select: ['KeyM', null], flee: ['KeyQ', null], auto: ['KeyW', null], ff: ['Backquote', null], demo: ['Escape', null],
  };
  const DEFAULT_PAD = { ok: 0, cancel: 1, square: 2, menu: 3, l1: 4, r1: 5, l2: 6, r2: 7, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
  // (menus need these: each keeps at least one key)
  const ESSENTIAL = ['up', 'down', 'left', 'right', 'ok', 'cancel', 'menu'];
  // the right-hand twin of a key counts as the same key (either Shift, either Enter...)
  const ALIAS = { ShiftRight: 'ShiftLeft', NumpadEnter: 'Enter', ControlRight: 'ControlLeft', AltRight: 'AltLeft', MetaRight: 'MetaLeft' };
  const STORE = 'ff7js_bindings';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  let keys = clone(DEFAULT_KEYS), pad = Object.assign({}, DEFAULT_PAD);
  let KEYMAP = {}, PADMAP = {};
  function rebuild() {
    KEYMAP = { F2: 'debug' }; PADMAP = {};
    for (const b in keys) keys[b].forEach(c => { if (c) KEYMAP[c] = b; });
    for (const b in pad) if (pad[b] != null) PADMAP[pad[b]] = b;
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE); if (!raw) return;
      const d = JSON.parse(raw);
      for (const [b] of BINDABLE) {
        const k = d.keys && d.keys[b];
        if (Array.isArray(k)) keys[b] = [0, 1].map(i => typeof k[i] === 'string' && k[i] && k[i] !== 'F2' ? k[i] : null);
        if (d.pad && b in d.pad) pad[b] = Number.isInteger(d.pad[b]) ? d.pad[b] : null;
      }
    } catch (e) { keys = clone(DEFAULT_KEYS); pad = Object.assign({}, DEFAULT_PAD); }
  }
  function store() { try { localStorage.setItem(STORE, JSON.stringify({ keys, pad })); } catch (e) { /* kept for this visit */ } }
  load(); rebuild();

  const keyDown = {};      // raw keyboard state per logical button (count of keys held)
  const latched = {};      // buttons pressed since the last update (so taps shorter than a frame register)
  const rawKeys = {};
  const state = {};        // per button: { held, pressed, released, frames }
  BUTTONS.forEach(b => state[b] = { held: false, pressed: false, released: false, frames: 0 });
  let anyPressed = false;
  let typed = [];          // characters typed this frame (name entry)
  const virt = {};         // buttons held by software (js/runner) for the next update
  let virtTyped = [];      // characters typed by software
  let locked = false;      // the Demo shuts the keyboard and pad out
  let capture = null;      // rebinding: { fn, padHeld } - the next key or pad button goes to fn, and nowhere else
  let padIgnore = {};      // pad buttons still held from a capture (ignored until let go)
  let charBtn = {}, charBtnNow = {};   // buttons pressed this frame by a key that also typed a character (name entry)

  window.addEventListener('keydown', (e) => {
    const code = ALIAS[e.code] || e.code;
    if (capture) {
      e.preventDefault();
      if (e.repeat || code === 'F2') return;
      const c = capture; capture = null; c.fn({ key: code });
      return;
    }
    const b = KEYMAP[code];
    if (e.repeat && !rawKeys[e.code]) { if (b) e.preventDefault(); return; }   // (held through a capture: not a press)
    if (b) { e.preventDefault(); if (!rawKeys[e.code]) { rawKeys[e.code] = b; keyDown[b] = (keyDown[b] || 0) + 1; latched[b] = true; if (e.key && e.key.length === 1) charBtn[b] = true; } }
    if (e.key && e.key.length === 1) typed.push(e.key);
    else if (e.key === 'Backspace') typed.push('\b');
    FF7.audio && FF7.audio.unlock();
  });
  window.addEventListener('keyup', (e) => {
    const b = rawKeys[e.code];   // (the button it went down as, even if rebound since)
    if (b) { rawKeys[e.code] = false; keyDown[b] = Math.max(0, (keyDown[b] || 0) - 1); }
  });
  window.addEventListener('blur', () => { for (const k in rawKeys) rawKeys[k] = false; for (const b in keyDown) keyDown[b] = 0; });
  window.addEventListener('mousedown', () => FF7.audio && FF7.audio.unlock());

  function pads() { try { return navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; } catch (e) { return []; } }
  function padButtons() { const out = {}; for (const p of pads()) p.buttons.forEach((btn, i) => { if (btn && btn.pressed) out[i] = true; }); return out; }
  function padState() {
    const out = {}, down = padButtons();
    for (const i in padIgnore) if (!down[i]) delete padIgnore[i];
    for (const i in down) if (PADMAP[i] && !padIgnore[i]) out[PADMAP[i]] = true;
    for (const p of pads()) {
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.5) out.left = true; if (ax > 0.5) out.right = true;
      if (ay < -0.5) out.up = true; if (ay > 0.5) out.down = true;
    }
    return out;
  }

  // ---- names for the screen: KeyboardEvent.code -> 'Z', 'Shift', 'Num 8'... (the layout's own letter when the
  // browser tells it), pad button -> 'A', 'LB', 'D-Up'... (the standard mapping, Xbox names)
  let layout = null;
  try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { layout = m; }).catch(() => {}); } catch (e) { }
  const NAMES = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Enter: 'Enter', Backspace: 'Backspace', Tab: 'Tab',
    Escape: 'Esc', ShiftLeft: 'Shift', ControlLeft: 'Ctrl', AltLeft: 'Alt', MetaLeft: 'Meta', CapsLock: 'Caps Lock', PageUp: 'Page Up',
    PageDown: 'Page Down', Home: 'Home', End: 'End', Insert: 'Insert', Delete: 'Delete', Backquote: '`', Minus: '-', Equal: '=',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\',
    NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /', NumpadDecimal: 'Num .', ContextMenu: 'Menu key',
  };
  const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'Home'];
  function keyName(code) {
    if (!code) return '';
    if (/^(Key|Digit|Backquote|Minus|Equal|Bracket|Backslash|Semicolon|Quote|Comma|Period|Slash)/.test(code) && layout && layout.get(code)) {
      const ch = layout.get(code); if (ch && ch.trim()) return ch.toUpperCase();
    }
    if (NAMES[code]) return NAMES[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
    if (/^F\d+$/.test(code)) return code;
    return code.replace(/(Left|Right)$/, '');
  }
  const padName = (i) => i == null ? '' : PAD_NAMES[i] || 'Button ' + i;

  const I = FF7.input = {
    typed: [],
    update() {
      const padNow = locked ? {} : padState();
      if (capture) {   // (rebinding: a pad button newly down goes to the capture; nothing else counts)
        const down = padButtons();
        for (const i in capture.padHeld) if (!down[i]) delete capture.padHeld[i];
        const i = Object.keys(down).find(k => !capture.padHeld[k]);
        if (i != null) { const c = capture; capture = null; padIgnore[i] = true; c.fn({ pad: +i }); }
      }
      anyPressed = false;
      for (const b of BUTTONS) {
        const s = state[b];
        const now = !capture && (((!locked || b === 'demo' || b === 'ff') && ((keyDown[b] || 0) > 0 || !!latched[b])) || !!padNow[b] || !!virt[b]);
        latched[b] = false;
        s.pressed = now && !s.held;
        s.released = !now && s.held;
        s.held = now;
        s.frames = now ? s.frames + 1 : 0;
        if (s.pressed) anyPressed = true;
      }
      this.typed = (locked || capture ? [] : typed).concat(virtTyped); typed = []; virtTyped = [];
      charBtnNow = charBtn; charBtn = {};
    },
    // this frame's press of b came from a key that also typed a character (a letter bound to OK, say: the name
    // entry takes the letter, not the press)
    typedPress(b) { return !!charBtnNow[b]; },
    // Software input (js/runner): the logical buttons held for the next update, typed characters,
    // and a lock that shuts the keyboard and pad out while the Demo plays (the Demo and fast-forward keys still work).
    setVirtual(list) { for (const b in virt) delete virt[b]; (list || []).forEach(b => { virt[b] = true; }); },
    typeVirtual(chars) { for (const ch of chars) virtTyped.push(ch); },
    lock(on) { locked = !!on; for (const k in rawKeys) rawKeys[k] = false; for (const b in keyDown) keyDown[b] = 0; for (const b in latched) latched[b] = false; typed = []; },
    isLocked() { return locked; },
    held(b) { return state[b].held; },
    pressed(b) { return state[b].pressed; },
    released(b) { return state[b].released; },
    frames(b) { return state[b].frames; },
    // Cursor-style auto repeat: fires on press, then after 16 frames every 4 frames.
    repeat(b) { const f = state[b].frames; return f === 1 || (f > 16 && f % 4 === 0); },
    any() { return anyPressed; },
    // Swallow current presses (after a scene change so one press isn't handled twice).
    consume() { for (const b of BUTTONS) state[b].pressed = false; anyPressed = false; this.typed = []; },
    dir() { // held direction vector
      let x = 0, y = 0;
      if (state.left.held) x -= 1; if (state.right.held) x += 1;
      if (state.up.held) y -= 1; if (state.down.held) y += 1;
      return { x, y };
    },
    // "Back" in menus: X (cancel) or Triangle (menu)
    back() { return state.cancel.pressed || state.menu.pressed; },

    // ---- rebinding (Config > Controls, js/ui/menu_main.js)
    BINDABLE, ESSENTIAL,
    keysOf(b) { return (keys[b] || [null, null]).slice(); },
    padOf(b) { return pad[b] != null ? pad[b] : null; },
    keyName, padName,
    // what to show for a button in a hint: its first key ('Tab'), or its pad button when a gamepad is connected
    label(b, o = {}) {
      if (!o.keys && pad[b] != null && pads().length) return padName(pad[b]);
      const k = (keys[b] || []).find(Boolean);
      return k ? keyName(k) : pad[b] != null ? padName(pad[b]) : '—';
    },
    keyLabel(b) { const k = (keys[b] || []).find(Boolean); return k ? keyName(k) : ''; },
    // the next key or pad button (not F2) goes to fn({ key } | { pad }) instead of the game
    capture(fn) { capture = { fn, padHeld: padButtons() }; for (const b in keyDown) keyDown[b] = 0; for (const k in rawKeys) rawKeys[k] = false; },
    cancelCapture() { capture = null; },
    capturing() { return !!capture; },
    // bind a key to button b's slot (0 / 1). A key another button had moves here; that button gets this slot's old
    // key back. Returns { ok, other, msg }
    bindKey(b, slot, code) {
      if (!keys[b] || !code || code === 'F2') return { ok: false, msg: 'That key is taken by the game.' };
      const old = keys[b][slot];
      if (old === code) return { ok: true };
      let other = null;
      for (const ob in keys) {
        const j = keys[ob].indexOf(code); if (j < 0 || (ob === b && j === slot)) continue;
        other = ob;
        if (ob === b) { keys[b][j] = old; break; }                  // (the other slot of the same button: a swap)
        if (!old && ESSENTIAL.includes(ob) && !keys[ob].some((c, k) => c && k !== j)) return { ok: false, msg: keyName(code) + ' is the only key for ' + nameOf(ob) + '.' };
        keys[ob][j] = old;
        break;
      }
      keys[b][slot] = code;
      rebuild(); store();
      return { ok: true, other: other !== b ? other : null, msg: other && other !== b ? (old ? nameOf(other) + ' now uses ' + keyName(old) + '.' : 'Removed from ' + nameOf(other) + '.') : '' };
    },
    bindPad(b, idx) {
      const old = pad[b] != null ? pad[b] : null;
      let other = null;
      for (const ob in pad) if (ob !== b && pad[ob] === idx) { other = ob; pad[ob] = old; }
      pad[b] = idx;
      rebuild(); store();
      return { ok: true, other, msg: other ? (old != null ? nameOf(other) + ' now uses ' + padName(old) + '.' : 'Removed from ' + nameOf(other) + '.') : '' };
    },
    // clear a key slot (not a menu button's last key) or the pad button
    clearKey(b, slot) {
      if (!keys[b] || !keys[b][slot]) return { ok: false };
      if (ESSENTIAL.includes(b) && !keys[b].some((c, k) => c && k !== slot)) return { ok: false, msg: nameOf(b) + ' needs a key.' };
      keys[b][slot] = null; rebuild(); store(); return { ok: true };
    },
    clearPad(b) { if (pad[b] == null) return { ok: false }; pad[b] = null; rebuild(); store(); return { ok: true }; },
    resetBindings() { keys = clone(DEFAULT_KEYS); pad = Object.assign({}, DEFAULT_PAD); rebuild(); store(); },
    isDefault() { return JSON.stringify(keys) === JSON.stringify(DEFAULT_KEYS) && JSON.stringify(pad) === JSON.stringify(DEFAULT_PAD); },
  };
  function nameOf(b) { const e = BINDABLE.find(x => x[0] === b); return e ? e[1].replace(/ \(.*\)$/, '') : b; }
})();

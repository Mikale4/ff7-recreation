// Runner: an autonomous player (docs/RUNNER.md). It plays the game from plan files
// (js/runner/plans/plan_<chapter>.js) through the game's own input path: logical buttons held and
// pressed through FF7.input (setVirtual), pathfinding on the field grids and the world map, and the
// fixed 60 Hz frame step (FF7.stepFrame calls FF7.beforeFrame, the runner, first). Dialogue, choices,
// naming screens, party screens, shops, save prompts, battles (a tactician over the Auto-battle AI),
// movies and minigames (their auto-play bots, js/runner/mgbot.js) are handled as they come up. A
// watchdog stops the run on the first thing that looks wrong and records where it happened.
//   FF7.runner.start({ mode: 'demo' | 'dev' | 'fast', chapters, plan, resume, from, to, retries })
//   FF7.runner.stop(), .report(), .status(), .checkpoint(label), .restore(label)
(function () {
  const U = FF7.util, F = FF7.field;
  const R = FF7.runner = FF7.runner || {};
  R.plans = R.plans || {};      // chapter id -> ops (the plan files register themselves)
  R.starts = R.starts || {};    // chapter id -> synthetic start profile (tools/run_runner.js --start)
  // Route order: the story chapters; the optional chapters (C12a, C12b) are played on Disc 3 before
  // the final dungeon (C11b).
  R.CHAPTERS = ['c1', 'c2', 'c3', 'c4', 'c5a', 'c5b', 'c6a', 'c6b', 'c7', 'c8', 'c9', 'c10', 'c11a', 'c12a', 'c12b', 'c11b'];
  R.ops = {};                   // op name -> function* (...args) returning true or a reason string
  R.active = false;
  R.statusText = 'idle';

  // ops that act on the current field map (the step's map context applies when resuming)
  const MAP_OPS = new Set(['talk', 'use', 'item', 'chest', 'items', 'walk', 'exit', 'shop', 'inn', 'save']);
  // plan ops that end somewhere else than they started (aboard the Highwind, on the world map): the steps after
  // them have no known map context until the next goto (plan files add their own: R.worldOps.add(name))
  R.worldOps = R.worldOps || new Set();
  const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const safe = (fn) => { try { return fn(); } catch (e) { return false; } };
  const norm = (s) => (typeof s === 'string' ? [s] : s);
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function';
  // a step's options: its last argument when that is a plain object ({ done, budget, choose, map, then, ... })
  const stepOpts = (s) => { const last = s[s.length - 1]; return s.length > 1 && isObj(last) ? last : {}; };
  const errText = (e) => (e && e.message ? e.message : String(e)) + (e && e.stack ? ' | ' + String(e.stack).split('\n').slice(1, 3).map(x => x.trim()).join(' | ') : '');
  const angWrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const mod = (a, n) => ((a % n) + n) % n;
  const wrapD = (d, n) => { while (d > n / 2) d -= n; while (d < -n / 2) d += n; return d; };
  const btnsFor = (ix, iy) => { const b = []; if (ix < 0) b.push('left'); if (ix > 0) b.push('right'); if (iy < 0) b.push('up'); if (iy > 0) b.push('down'); return b; };
  // world direction of an input direction: on a field (FieldScene.movePlayer) and on the world map (WorldScene.move)
  function fieldVec(ix, iy, yawDeg) { const y = (yawDeg || 0) * Math.PI / 180, l = Math.hypot(ix, iy), mx = ix / l, mz = iy / l; return [mx * Math.cos(y) + mz * Math.sin(y), -mx * Math.sin(y) + mz * Math.cos(y)]; }
  function worldVec(ix, iy, yawDeg) { const y = (yawDeg || 0) * Math.PI / 180, l = Math.hypot(ix, iy), mx = ix / l, mz = iy / l; return [mx * Math.cos(y) - mz * Math.sin(y), mx * Math.sin(y) + mz * Math.cos(y)]; }

  // ================================================================== lifecycle
  function freshRun(o) {
    R.opts = o;
    R.fast = o.mode !== 'demo';
    R.pc = 0; R.frames = 0; R.busyFrames = 0; R.freeStreak = 0; R.lastOpFrame = 0; R.gap = false;
    R.stepStart = 0; R.stepBudget = 0; R.stepLabel = '';
    R.log = []; R.issues = []; R.notes = [];
    R.chapter = null; R.chapterTitle = ''; R.objective = '';
    R.choices = []; R.names = []; R.partyWant = null; R.battleOpts = {}; R.mgWant = null; R.shopTask = null;
    R.dateTarget = o.dateTarget || 'aeris';          // who the date-point answers favour (R.datePick)
    R.holds = {}; R.lastHeld = {}; R.typeBuf = '';
    R.ckpts = {}; R.lastCkpt = null; R.retries = {}; R.stepFails = {}; R.pendingRestore = null; R.endStatus = null; R.gearLater = {};
    R.curBattle = null; R.curMinigame = null; R.sensed = {}; R.resumePending = false;
    R._stallKey = null; R._stallN = 0; R._ids = 0; R._goSeen = false; R._savedAt = null;
    R._mapLog = []; R._lastWhere = null;           // (the maps passed, by frame: the frames start again from 0)
    R.menuOwn = false; R.side = null; R._cfgTrip = false;
    R.recentTexts = []; R._worldGoals = null; R._fired = null; R._trigSeen = null; R._hookSeen = null; R.lastBattle = null; R._healDue = false;
    R.limitPins = {}; R._limitDefer = {};                // (js/runner/limits.js)
    R.limitPolicy = o.limitPolicy !== false && R._pendingLimitPolicy !== false; R._pendingLimitPolicy = undefined;
    R.stats = { battles: 0, won: 0, escaped: 0, lost: 0, gameOvers: 0, received: [], drops: [], choices: [], minigames: [], saves: 0, steals: 0, eskills: [], restores: 0 };
  }

  R.buildPlan = function (chapters) {
    const out = [];
    R.chapterOf = [];
    for (const ch of chapters) {
      const ops = R.plans[ch];
      if (!ops) { out.push(['todo', 'there is no plan file for chapter ' + ch]); R.chapterOf.push(ch); break; }
      ops.forEach(s => { out.push(s); R.chapterOf.push(ch); });
      if (ops.some(s => norm(s)[0] === 'todo')) break;
    }
    return out;
  };

  // o: { mode: 'demo' (real time, dialogue mashed, movies skipped, saves into the DEMO file) | 'dev'
  //      (browser console, fast) | 'fast' (headless, fast), chapters: [...] (default the whole route),
  //      plan: [...ops] (instead of chapters), resume: true (find where the current game stands),
  //      from: checkpoint label, to: checkpoint label (stop there), retries: n (restore the last
  //      checkpoint after a Game Over / failed step), demoSave: true (write the DEMO file outside a Demo),
  //      menus: 'apply' (menu ops through the systems, not the menu screens: js/runner/menus.js),
  //      onEnd(status, issue), onLog(line) }
  R.start = function (o = {}) {
    if (R.active) R.stop('restarted');
    o = Object.assign({ mode: 'fast', retries: o.mode === 'demo' ? 3 : 0, movies: 'skip', readSpeed: 1 }, o);
    freshRun(o);
    R.plan = o.plan ? o.plan.slice() : R.buildPlan(o.chapters || R.CHAPTERS);
    R.ctx = R.contexts(R.plan);
    R.active = true; R.statusText = 'running';
    R.applyConfig();
    R.installTactician();
    if (o.from) {
      if (!R.restore(o.from)) { R.active = false; R.statusText = 'no checkpoint'; R.say('no checkpoint "' + o.from + '"'); return false; }
    } else if (o.resume) {
      // (o.at: the step a Demo file was saved on, if the route hasn't changed since (o.atSteps: its length then))
      R.pc = o.at != null && o.atSteps === R.plan.length && o.at < R.plan.length ? o.at : R.findResume(R.plan);
      R.replayState(R.pc);
      R.resumePending = true;
      R.say('resuming at step ' + R.pc + ': ' + R.stepText(R.plan[R.pc]));
      R.gen = R.main();
    } else R.gen = R.main();
    R.say('runner started (' + o.mode + ', ' + R.plan.length + ' steps)');
    return true;
  };

  R.stop = function (why) {
    if (!R.active) return;
    R.active = false;
    if (R.statusText === 'running') R.statusText = 'stopped';
    R.gen = null; R.holds = {}; R.lastHeld = {}; R.side = null; R.menuOwn = false;
    FF7.input.setVirtual([]);
    const mg = FF7.sceneMgr.stack.find(s => s.isMinigame && s._runner);
    if (mg) mg.I = FF7.input;                       // whoever takes over plays it
    R.restoreConfig();
    R.uninstallTactician();
    R.say('runner stopped: ' + (why || R.statusText));
  };

  R.finish = function (status) {
    if (!R.active) return;
    R.statusText = status;
    R.stop(status);
    if (R.opts.onEnd) { try { R.opts.onEnd(status, R.issues[R.issues.length - 1] || null); } catch (e) { console.error(e); } }
  };

  R.say = function (msg) {
    const st = FF7.state;
    const line = '[' + (R.frames || 0) + ' #' + R.pc + (st ? ' ' + U.fmtTime(st.time || 0) : '') + '] ' + msg;
    R.log = R.log || []; R.log.push(line); if (R.log.length > 3000) R.log.splice(0, 500);
    if (R.opts && R.opts.onLog) R.opts.onLog(line);
    return line;
  };
  R.note = function (msg) { (R.notes = R.notes || []).push(msg); R.say('note: ' + msg); };

  // Records what went wrong, where, and stops (the harness prints it; the Demo hands control back).
  R.issue = function (kind, msg) {
    const s = R.status();
    const rec = { kind, msg, step: R.pc, op: R.stepText(R.plan && R.plan[R.pc]), chapter: R.chapter, map: s.map, pos: s.pos, frame: R.frames, time: s.time, top: s.top };
    R.issues.push(rec);
    R.say('!! ' + kind + ': ' + msg + ' (step ' + rec.step + ' ' + rec.op + ' @ ' + rec.map + ' ' + JSON.stringify(rec.pos) + ')');
    R.finish('issue');
    return rec;
  };

  // FF7.beforeFrame: the Demo toggle (Esc) and fast-forward (`) are polled; an active run steps one frame.
  FF7.beforeFrame = function () {
    if (R.demo && R.demo.poll) { try { R.demo.poll(); } catch (e) { console.error('demo', e); } }
    if (R.active) R.tick();
  };

  R.tick = function () {
    R.frames++;
    { const w = R.where(); if (w !== R._lastWhere) { R._lastWhere = w; (R._mapLog = R._mapLog || []).push([R.frames, w]); if (R._mapLog.length > 400) R._mapLog.splice(0, 100); } }   // the maps passed (R.gotoMap)
    try { R.watchScripts(); } catch (e) { R.note('watchScripts: ' + errText(e)); }
    let busy = true;
    try { busy = R.handle(); } catch (e) { R.issue('error', 'event handler: ' + errText(e)); }
    if (R.active) {
      if (busy) { R.busyFrames++; R.freeStreak = 0; }
      else {
        R.freeStreak++;
        R.gap = R.frames - R.lastOpFrame > 1; R.lastOpFrame = R.frames;
        let r = null;
        if (R.side) {                                    // a side task first (a visible save, the Config trip)
          let q = { done: true };
          try { q = R.side.next(); } catch (e) { R.note('side task: ' + errText(e)); }
          R._sideEnd = R.frames;                          // (maps walked through on a side trip: not the story's doing, R.gotoMap)
          if (q.done) { R.side = null; R.menuOwn = false; }
        } else try { r = R.gen ? R.gen.next() : { done: true }; } catch (e) { r = { done: true }; R.issue('error', 'step ' + R.pc + ' (' + R.stepText(R.plan[R.pc]) + '): ' + errText(e)); }
        if (R.active && r && r.done) {
          if (R.pendingRestore) { const l = R.pendingRestore; R.pendingRestore = null; if (!R.restore(l, { retry: true })) R.issue('retry', 'could not restore ' + l); }
          else R.finish(R.endStatus || 'done');
        }
      }
      if (R.active) R.watch(busy);
    }
    R.applyInput();
  };

  // ================================================================== input (logical buttons)
  R.hold = function (b, n = 1) { R.holds[b] = Math.max(R.holds[b] || 0, n); };
  // a press needs a frame without the button first (FF7.input sees presses on the edge)
  R.tap = function (b) { if (R.lastHeld[b] || R.holds[b]) return false; R.holds[b] = 1; return true; };
  R.type = function (s) { R.typeBuf += s; };
  R.applyInput = function () {
    const list = [];
    for (const b in R.holds) { if (R.holds[b] > 0 && R.active) list.push(b); if (--R.holds[b] <= 0) delete R.holds[b]; }
    R.lastHeld = {}; list.forEach(b => { R.lastHeld[b] = true; });
    FF7.input.setVirtual(list);
    if (R.typeBuf && R.active) FF7.input.typeVirtual(R.typeBuf);
    R.typeBuf = '';
  };
  // hold a direction (+ run) for one frame
  R.dirHold = function (d, run) {
    btnsFor(d[0], d[1]).forEach(b => R.hold(b, 1));
    const cfg = FF7.state && FF7.state.config;
    if (!!run !== !!(cfg && cfg.alwaysRun)) R.hold('run', 1);   // C runs (or walks, with Config > Run: Always)
  };

  // ================================================================== config
  R.applyConfig = function () {
    const c = FF7.state && FF7.state.config; if (!c) return;
    if (!R.cfgSaved) R.cfgSaved = { autoBattle: c.autoBattle, battleSpeed: c.battleSpeed, battleMsgSpeed: c.battleMsgSpeed, alwaysRun: c.alwaysRun };
    // the party fights through Auto (the tactician) and runs everywhere (Config > Run: Always; R.dirHold
    // holds C only to walk). With the menus driven (the default) both are switched on like a player
    // does: W in the first battle (R.onBattle) and a trip into Config (R.sideTasks).
    if (!(R.menuVisible && R.menuVisible())) { c.autoBattle = true; c.alwaysRun = true; }
    if (R.fast) { c.battleSpeed = 1; c.battleMsgSpeed = 1; }
  };
  R.restoreConfig = function () {
    const c = FF7.state && FF7.state.config;
    if (c && R.cfgSaved) Object.assign(c, R.cfgSaved);
    R.cfgSaved = null;
  };

  // ================================================================== what is on screen
  R.top = () => FF7.sceneMgr.top();
  R.isField = (sc) => !!(sc && F.FieldScene && sc instanceof F.FieldScene);
  R.isWorld = (sc) => !!(sc && sc.isWorld);
  R.isMovie = (sc) => !!(sc && (sc.isMovie || (FF7.cinema && FF7.cinema.MovieScene && sc instanceof FF7.cinema.MovieScene)));
  R.isMainMenu = (sc) => !!(sc && Array.isArray(sc.panels) && typeof sc.pushPanel === 'function');
  R.isGameOver = (sc) => !!(sc && FF7.scenes.GameOver && sc instanceof FF7.scenes.GameOver);
  R.field = () => { const t = R.top(); return R.isField(t) ? t : null; };
  R.worldScene = () => { const t = R.top(); return R.isWorld(t) ? t : null; };
  // the map the game is on ('world' on the world map), even under a battle or a menu
  R.where = function () {
    const st = FF7.sceneMgr.stack;
    for (let i = st.length - 1; i >= 0; i--) { const s = st[i]; if (R.isWorld(s)) return 'world'; if (R.isField(s)) return s.map ? s.map.id : null; }
    return null;
  };
  R.topModal = function () { const L = FF7.sceneMgr.layer; for (let i = L.length - 1; i >= 0; i--) { const w = L[i]; if (w.modal && !w.done) return w; } return null; };
  R.fieldFree = (fs) => !fs.busy && !fs.transitioning && !(fs.queue && fs.queue.length) && fs.player && fs.player.jump == null;
  R.api = function () { const w = R.worldScene(); if (w) return w.api; const f = R.field() || FF7.fieldScene; return f ? f.api : new F.ScriptAPI(null); };
  R.avgLevel = function (all) {
    const st = FF7.state, ids = all ? st.members : st.party.filter(Boolean);
    const lv = ids.map(id => st.chars[id]).filter(Boolean).map(c => c.level);
    return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 0;
  };

  // ================================================================== events (dialogue, battles, movies...)
  // Returns true while the game is busy: the plan's current step only runs on free frames.
  R.handle = function () {
    const S = FF7.sceneMgr, top = S.top();
    R.trackEnds();
    if (R.isGameOver(top)) { R.onGameOver(); return true; }
    if (FF7._gameOverPending) return true;
    const w = R.topModal();
    if (w) { R.onWidget(w); return true; }
    if (S.transition) return true;
    if (!top) return false;                            // nothing up yet (headless): ['new'] puts the title up
    if (R.sceneHook) { const h = R.sceneHook(top); if (h != null) return h; }   // (Kupomon's screens: js/kupomon/kp_runner.js)
    if (top.isBattle) { R.onBattle(top); return true; }
    if (top.isMinigame) { R.onMinigame(top); return true; }
    if (R.isMovie(top)) { R.onMovie(top); return true; }
    if (R.isMainMenu(top)) { if (R.menuOwn) return false; if (R.frames % 8 === 0) R.tap('cancel'); return true; }   // ours (a menu op), or one nobody asked for
    if (top.isTitle) return false;
    if (top.isEnding) return false;                   // the staff roll / THE END (js/scenes/ending.js): the route's last steps run
    if (R.isField(top)) { const free = R.fieldFree(top); if (free) { R.autoSave(top); R.sideTasks(); } return !free; }
    if (R.isWorld(top)) { const busy = !!(top.busy || top.transitioning || (top.queue && top.queue.length)); if (!busy) R.sideTasks(); return busy; }
    return true;
  };

  // battles and minigames that ended since the last frame
  R.trackEnds = function () {
    const stack = FF7.sceneMgr.stack;
    const b = R.curBattle;
    if (b && !stack.includes(b)) {
      const res = b.waiter && b.waiter.result;
      if (res === 'win') R.stats.won++; else if (res === 'escape') R.stats.escaped++; else if (res === 'lose') R.stats.lost++;
      R.stats.steals += (b.enemies || []).filter(e => e.stolen).length;
      R.say('battle ' + (res || '?') + ': ' + R.battleNames(b));
      if (res === 'win' || res === 'escape') R._healDue = true;
      const lb = R.lastBattle;
      if (lb && lb.n === R.stats.battles) {
        Object.assign(lb, { result: res || 'lose', turns: b.turnCount || 0, frames: R.frames - lb.frame,
          steals: (b.enemies || []).filter(e => e.stolen).map(e => ({ enemy: e.id, item: e.stolenItem || null })),
          morphs: (b.morphed || []).slice(), eskills: res === 'win' ? (b.learnedEskills || []).map(l => l.id) : [],
          caught: (b.enemies || []).some(e => e.caught), fled: (b.enemies || []).filter(e => e.fled).map(e => e.id) });
        // (the log's record of what the battle gave: steals, morphs, Enemy Skills)
        lb.steals.forEach(x => { if (x.item) R.say('stole ' + U.itemName(x.item) + ' (' + x.enemy + ')'); });
        if (res === 'win') lb.morphs.forEach(i => R.say('morphed ' + U.itemName(i)));
        lb.eskills.forEach(e => R.say('eskill learned: ' + ((FF7.data.eskills[e] || {}).name || e)));
        R.runBattleHooks('end', b, lb);
      }
      R.curBattle = null;
      if (R.battleOpts && R.battleOpts.once) R.battleOpts = {};
    }
    const m = R.curMinigame;
    if (m && !stack.includes(m)) {
      const res = m.result || (m.waiter && m.waiter.result) || {};
      R.stats.minigames.push({ id: m.def.id, won: !!res.won, score: res.score, tries: m.tries });
      R.say('minigame ' + m.def.id + ': ' + (res.won ? 'won' : 'lost') + ' (score ' + res.score + ', tries ' + m.tries + ')');
      const want = m._rWant || {};
      R.curMinigame = null;
      if (want.mustWin && !res.won) R.issue('minigame', m.def.id + ' was lost');
    }
  };

  R.onWidget = function (w) {
    const UI = FF7.ui;
    if (UI.TextBox && w instanceof UI.TextBox) return R.onText(w);
    if (w.panel && w.panel.mode) return R.onSaveMenu(w);
    if (Array.isArray(w.grid) && typeof w.finish === 'function' && w.defName !== undefined) return R.onNameEntry(w);
    if (Array.isArray(w.members) && Array.isArray(w.party) && Array.isArray(w.required)) return R.onPartySelect(w);
    if (w.shop && Array.isArray(w.stock)) return R.onShop(w);
    if (Array.isArray(w.reel) && w.question) return R.onHandicapReel(w);
    if (Array.isArray(w.lines) && w.fade !== undefined) return R.onCaption(w);
    if (R.frames % 12 === 0) R.tap('cancel');       // anything else (a debug menu...): back out
  };

  // reading time for a page of n characters (Demo only): brisk, about a second for a typical box
  // Demo: OK is mashed, a press every R.MASH frames (the first finishes the page, the next turns it)
  R.MASH = 2;
  R.readFrames = (n) => Math.round((14 + n * 0.7) / (R.opts.readSpeed || 1));

  R.onText = function (w) {
    if (w.open < 1) return;
    const last = w.page === w.pages.length - 1, full = w.shown >= w.chars;
    if (w._rPage !== w.page) {
      w._rPage = w.page; w._rT = 0;
      const txt = w.pages[w.page].join(' ');
      R.recentTexts.push(txt); if (R.recentTexts.length > 6) R.recentTexts.shift();   // (a choose function's third argument)
      const m = /Received\s+(.+?)!\s*$/.exec(txt); if (m) { R.stats.received.push(m[1].replace(/["“”]/g, '')); R.say('received ' + m[1]); }
      if (/You caught a chocobo/i.test(txt)) { R.stats.chocobos = (R.stats.chocobos || 0) + 1; R.say('caught a chocobo'); }
      else if (/chocobo ran off/i.test(txt)) { R.stats.chocoboMisses = (R.stats.chocoboMisses || 0) + 1; R.say('the chocobo ran off'); }
    }
    w._rT++;
    if (w.choices && last && full) return R.onChoice(w);
    if (w.opts && w.opts.auto) return;               // closes by itself
    if (R.fast) { R.tap('ok'); return; }
    if (w._rT % R.MASH === 0) R.tap('ok');           // Demo: mash through it
  };

  // the Battle Square's handicap reel (js/maps/c12/part4.js): the answer is picked like a question's (the queued
  // responders see the reel's handicaps as choices), then OK goes in while the symbol before it shows: the reel
  // stops one symbol past the one in the window
  R.onHandicapReel = function (w) {
    if (w.stopping || w.result != null) return;
    if (w._rPick == null) {
      w._rPick = R.pickChoice({ choices: w.choices, pages: [[w.question]], cursor: 0 });
      R.stats.choices.push({ q: w.question.slice(0, 80), choices: w.choices.slice(), pick: w._rPick });
      R.say('handicap reel [' + w.choices.join(' / ') + '] -> ' + w.choices[w._rPick]);
    }
    const n = w.choices.length;
    if (w.t > 30 && w.shown === (w._rPick + n - 1) % n) R.tap('ok');
  };
  R.onChoice = function (w) {
    if (w._rPick == null) {
      w._rPick = R.pickChoice(w);
      const q = w.pages.map(p => p.join(' ')).join(' ').trim();
      R.stats.choices.push({ q: q.slice(0, 80), choices: w.choices.slice(), pick: w._rPick });
      R.say('choice ' + (q ? '"' + q.slice(0, 50) + '" ' : '') + '[' + w.choices.join(' / ') + '] -> ' + w.choices[w._rPick]);
      w._rWait = 0;
    }
    const want = w._rPick;
    if (w.cursor !== want) { const n = w.choices.length; R.tap(((want - w.cursor + n) % n) <= n / 2 ? 'down' : 'up'); return; }
    if (!R.fast && ++w._rWait < 8) return;           // the viewer sees the answer picked
    R.tap('ok');
  };
  // the first queued answer that fits this question (['choose', ...]); otherwise the box's default. Answers
  // that don't fit are passed over (kept for a later question); a text answer passed over by 3 questions
  // is dropped as stale (its question never came). A function answer is asked (choices, w, recentTexts):
  // the last few pages shown, a box that closed by itself before the question included.
  R.STALE_AFTER = 3;
  R.pickChoice = function (w) {
    const q = R.choices, low = (s) => String(s).toLowerCase().replace(/[“”"'’.!?,…]/g, '').trim();
    const hk = R.hookDecline(w); if (hk != null) return hk;
    const asked = new Set(), passed = [];
    let pick = null;
    for (let k = 0; k < q.length && pick == null; k++) {
      const e = q[k], a = e.a;
      if (typeof a === 'number') {
        q.splice(k--, 1);
        if (a >= 0 && a < w.choices.length) pick = a; else R.note('choice index ' + a + ' out of range for [' + w.choices.join(' / ') + ']');
        continue;
      }
      if (typeof a === 'function') {
        if (asked.has(a)) continue; asked.add(a);         // (the same responder queued many times is asked once)
        let i = null; try { i = a(w.choices, w, R.recentTexts.slice()); } catch (err) { R.note('choice function: ' + errText(err)); }
        if (i != null && i >= 0 && i < w.choices.length) { q.splice(k, 1); pick = i; }
        continue;
      }
      const i = w.choices.findIndex(c => low(c).includes(low(a)));
      if (i >= 0) { q.splice(k, 1); pick = i; } else passed.push(e);
    }
    passed.forEach(e => {
      e.skips = (e.skips || 0) + 1;
      if (e.skips === 1) R.note('queued answer "' + e.a + '" is not among [' + w.choices.join(' / ') + ']: kept for a later question');
      if (e.skips >= R.STALE_AFTER && (e.pc == null || typeof e.pc === 'number')) {
        const k = q.indexOf(e); if (k >= 0) q.splice(k, 1);
        R.note('queued answer "' + e.a + '" dropped: not among the choices of the last ' + e.skips + ' questions (its question never came)');
      }
    });
    if (pick != null) return pick;
    if (R.dateTarget && w.opts && Array.isArray(w.opts.date)) return R.datePick(w);
    return w.cursor || 0;
  };
  // a world-map side place's question (a step hook: the sleeping man's cave "Go inside / Leave it") on a
  // tile the walk is only passing: the leave / no answer. Not within 2 tiles of a goal of the walk.
  R.DECLINE = /^(leave|keep (flying|going|walking)|no\b|not now|never ?mind|cancel|don.?t|walk on|move on|pass|ignore)/i;
  R.hookDecline = function (w) {
    const ws = FF7.sceneMgr.stack.find(sc => R.isWorld(sc));
    if (!ws || !ws.script || ws.script.name !== 'world-hook' || !R._worldGoals) return null;
    const D = R.worldD(), x = mod(Math.floor(ws.px), D.w), y = mod(Math.floor(ws.pz), D.h), k = x + ',' + y;
    if ([...R._worldGoals].some(g => { const [gx, gy] = g.split(',').map(Number); return Math.max(Math.abs(wrapD(gx - x, D.w)), Math.abs(wrapD(gy - y, D.h))) <= 2; })) return null;   // (at / near the goal: meant)
    const i = w.choices.findIndex(c => R.DECLINE.test(String(c).trim()));
    if (i < 0) return null;
    R.say('world: passing the side place at ' + k + ' ("' + w.choices[i] + '")');
    return i;
  };
  // FF7 date points (docs/DATE_POINTS.md): a question whose answers carry them (s.ask(..., { date: [{ aeris: 1 },
  // { tifa: -2 }, ...] }), the points of each answer) and that no queued answer took is answered for R.dateTarget
  // (['dateTarget', id]; 'aeris', FF7's default, unless the plan or start({ dateTarget }) says otherwise): the answer
  // that leaves the target furthest ahead of (or least behind) its closest rival, then the next closest and so on
  // (FF7's tie order counted); the box's default when no answer does better. { dateSoft: true } on a question whose
  // "worse" answers cost more than points (Yuffie running off) only weighs the closest rival.
  R.datePick = function (w) {
    const IDS = ['aeris', 'tifa', 'yuffie', 'barret'], t = R.dateTarget, d = w.opts.date, def = w.cursor || 0;
    const aff = (id) => (FF7.story && FF7.story.affection ? FF7.story.affection(id) : 0);
    if (!IDS.includes(t)) return def;
    const leads = (o) => IDS.filter(id => id !== t).map(id =>
      aff(t) + ((o && o[t]) || 0) - aff(id) - ((o && o[id]) || 0) + (IDS.indexOf(t) < IDS.indexOf(id) ? 0.5 : -0.5))
      .sort((a, b) => a - b).slice(0, w.opts.dateSoft ? 1 : 3);
    const better = (a, b) => { for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] > b[k]; return false; };
    let best = def, bestLeads = leads(d[def]);
    w.choices.forEach((c, i) => { const l = leads(d[i]); if (better(l, bestLeads)) { best = i; bestLeads = l; } });
    if (best !== def) R.say('date points: "' + w.choices[best] + '" for ' + t + ' (' + IDS.map(id => id + ' ' + aff(id)).join(', ') + ')');
    return best;
  };

  R.onCaption = function (w) {
    if (w.hold || w.closing || w.fade < 1) return;
    w._rT = (w._rT || 0) + 1;
    if (R.fast || w._rT % R.MASH === 0) R.tap('ok');
  };

  // the naming screen (js/ui/widgets.js NameEntry) as a player works it: Cancel back to what the wanted name starts
  // with, then the cursor to each letter in turn and OK; Enter (the menu button) when it reads right
  R.onNameEntry = function (w) {
    if (!w._r) {
      const i = R.names.findIndex(n => n.id === w.id);
      w._r = { want: i >= 0 ? String(R.names.splice(i, 1)[0].name).slice(0, 9) : null, t: 0 };
    }
    const r = w._r; r.t++;
    if (!R.fast && r.t < 45) return;
    if (r.want != null && w.name !== r.want) {
      if (!R.fast && r.t % 5) return;                                  // (a pace the viewer can follow)
      if (!r.want.startsWith(w.name)) { R.tap('cancel'); return; }
      const i = w.grid.indexOf(r.want[w.name.length]);
      if (i < 0) { r.want = w.name; return; }                         // (a letter the grid hasn't: keep the name so far)
      const tx = i % w.cols, ty = Math.floor(i / w.cols);
      if (w.cy !== ty) { R.tap((ty - w.cy + w.rows) % w.rows <= w.rows / 2 ? 'down' : 'up'); return; }
      if (w.cx !== tx) { R.tap((tx - w.cx + w.cols) % w.cols <= w.cols / 2 ? 'right' : 'left'); return; }
      R.tap('ok'); return;
    }
    if (!R.fast && r.t < 90) return;
    if (R.tap('menu')) R.say('name ' + w.id + ': ' + w.name);   // Enter confirms the name
  };

  R.onPartySelect = function (w) {
    const req = w.required, members = w.members, size = Math.min(3, members.length);
    let target = (R.partyWant || w.party).filter(id => members.includes(id));
    req.forEach(id => { if (!target.includes(id)) target.unshift(id); });
    for (const id of members) { if (target.length >= size) break; if (!target.includes(id)) target.push(id); }
    target = target.slice(0, size);
    const cur = new Set(w.party);
    let idx = members.findIndex(id => cur.has(id) && !target.includes(id) && !req.includes(id));
    if (idx < 0 && w.party.length < 3) idx = members.findIndex(id => !cur.has(id) && target.includes(id));
    if (idx < 0) idx = members.length;              // Done
    if (w.cursor !== idx) { R.tap(w.cursor < idx ? 'down' : 'up'); return; }
    w._rT = (w._rT || 0) + 1;
    if (!R.fast && w._rT % 20 !== 0) return;
    if (R.tap('ok') && idx === members.length) { R.say('party: ' + w.party.join(', ')); R.partyWant = null; }
  };

  R.onSaveMenu = function (w) {
    const p = w.panel;
    if (p.mode === 'save' && p.demoRow != null && R.menuVisible() && R.menus) return R.menus.savePrompt(w);   // saves into the DEMO row like a player
    if (p.msg) { R.tap('ok'); return; }
    if (p.confirm) { R.tap('cancel'); return; }
    if (p.mode === 'save' && !w._rSaved) { w._rSaved = true; R.saveGame('save prompt'); }
    w._rT = (w._rT || 0) + 1;
    if (R.fast || w._rT > 40) R.tap('cancel');       // the player's own slots are never written
  };

  // ---- shops: ['shop', npc, { buy: [[id, qty]...], sell: [[id, qty|'all']...] }] drives the Shop window
  R.onShop = function (w) {
    const task = R.shopTask;
    if (!R.fast) { w._rT = (w._rT || 0) + 1; if (w._rT % ((R.menus && R.menus.PACE.step) || 6)) return; }   // Demo: a pace a viewer can follow
    if (task && task.plan && !task.planned) { task.planned = true; const pl = task.plan(w) || {}; task.buy = pl.buy || []; task.sell = pl.sell || []; }   // ['gear']: decided on the shop's stock
    if (w.msg) { if (task && task.cur) { R.note('shop: ' + w.msg + ' (' + task.cur.id + ')'); task.cur.failed = true; } R.tap('ok'); return; }
    const next = task && (task.sellFirst ? (task.sell.find(e => !e.done) || task.buy.find(e => !e.done)) : (task.buy.find(e => !e.done) || task.sell.find(e => !e.done)));
    if (!next) {                                     // nothing (more) to do: leave
      if (task && !task.closed) { task.closed = true; R.say('shop done'); }
      R.tap('cancel'); return;
    }
    task.cur = next;
    if (next.failed) { next.done = true; return; }
    const buying = task.buy.includes(next);
    if (w.mode === 'menu') { const want = buying ? 0 : 1; if (w.menuIdx !== want) { R.tap('down'); return; } R.tap('ok'); return; }
    if (w.mode === 'qty') {
      const want = next.qty === 'all' || next.qty === 'max' ? w.qtyMax : Math.min(w.qtyMax, next.qty);
      if (w.qty < want) { if (want - w.qty >= 10) R.hold('r1', 2); R.tap('up'); return; }
      if (w.qty > want) { if (w.qty - want >= 10) R.hold('l1', 2); R.tap('down'); return; }
      if (R.tap('ok')) { next.done = true; R.say((buying ? 'bought ' : 'sold ') + want + ' ' + U.itemName(next.id)); }
      return;
    }
    const inBuy = w.mode === 'buy';
    if (inBuy !== buying) { R.tap('cancel'); return; }   // the wrong list: back to the menu
    const L = buying ? w.stock : w.sellList();
    const idx = L.findIndex(e => (buying ? e : e.id) === next.id || (buying ? e : e.id) === 'materia:' + next.id);
    if (idx < 0) { R.note('shop: ' + next.id + ' is not ' + (buying ? 'for sale here' : 'in the bag')); next.done = true; next.failed = true; return; }
    if (w.idx !== idx) { R.tap(w.idx < idx ? 'down' : 'up'); return; }
    R.tap('ok');
  };

  // ---- battles
  R.battleNames = (b) => (b.enemies || []).map(e => e.id).join(', ');
  R.onBattle = function (bs) {
    const cfg = FF7.state.config;
    const shown = R.menuVisible() && !bs.opts.noAuto;
    if (!cfg.autoBattle) { if (!shown) cfg.autoBattle = true; else if (bs.phase === 'fight') R.tap('auto'); }   // Auto on with W, like a player
    if (bs !== R.curBattle) {
      R.curBattle = bs; R.stats.battles++;
      R.say('battle ' + R.stats.battles + ': ' + R.battleNames(bs) + (bs.opts && bs.opts.random ? '' : ' (scripted)'));
      R.lastBattle = { n: R.stats.battles, formation: ((bs.form && bs.form.e) || []).slice(), enemies: (bs.enemies || []).map(e => e.id), map: R.where(),
        random: !!(bs.opts && bs.opts.random), type: bs.type || 'normal', result: null, turns: 0, drops: [], steals: [], morphs: [], eskills: [], gil: 0, exp: 0, ap: 0, frame: R.frames };
      R.runBattleHooks('start', bs);
    }
    R.runBattleHooks('frame', bs);
    if (bs.phase === 'victory') {
      const v = bs.victory; if (!v) return;
      if (!v._rSeen) { v._rSeen = true; (v.notices || []).filter(n => / learned "/.test(n)).forEach(n => R.say('learned: ' + n)); (v.items || []).forEach(i => R.stats.drops.push(i)); (bs.learnedEskills || []).forEach(e => R.stats.eskills.push(e.id)); if (R.lastBattle) Object.assign(R.lastBattle, { drops: (v.items || []).slice(), gil: v.gil || 0, exp: v.exp || 0, ap: v.ap || 0 }); }
      if (v.canInput && !v.canInput()) return;
      // headless: OK at once (a press finishes a count, the next turns the page); the Demo lets each EXP / AP /
      // Gil count play out, then presses OK after a short beat (a longer one to read the notices)
      if (R.fast || R.training || v.idleT >= (v.pages[v.page] === 'notices' ? 45 : 20)) R.tap('ok');   // (training: straight through)
      return;
    }
    if (bs.phase !== 'fight' && bs.phase !== 'intro') return;
    if (R.wantFlee(bs)) {
      R.hold('flee', 1);
      // (an escape that keeps failing: after R.FLEE_FRAMES a Smoke Bomb when the bag has one, else the party fights)
      if (bs.phase === 'fight') { bs._rFleeT = (bs._rFleeT || 0) + 1; if (bs._rFleeT === R.FLEE_FRAMES || bs._rFleeT === R.FLEE_FRAMES * 2) R.fleeStuck(bs); }
    }
    if (bs.reelW && !bs.reelW.done) R.onReel(bs, bs.reelW);
    // battles without Auto (opts.noAuto): the tactician's action goes in through the command menu
    const m = bs.menu;
    if (m && m.open && m.actor && (m.state === 'command' || (m.state === 'manip' && !m.actor.isParty)) && (bs.opts.noAuto || (!cfg.autoBattle && !shown))) {
      const act = R.tactic(bs, m.actor);
      if (act) m.submit(act);
    }
  };
  // battle options: flee: true | 'random' (random battles), 'all' (scripted ones too); fleeUnless: [enemy ids]
  // (run unless one of them is there: fight what drops / teaches something); fleeIf: fn(battle, R) (run when
  // it says so); fleeBelow: 0.4 (run once the party's HP falls under that share). All random battles only,
  // but flee: 'all'.
  R.FLEE_FRAMES = 480;
  R.fleeStuck = function (bs) {
    if (!bs._rSmoke && !bs.noEscape && FF7.sys.inv.count('smoke_bomb') > 0) { bs._rSmoke = true; R.say('flee: the escape keeps failing: a Smoke Bomb'); return; }
    bs._rFleeGaveUp = true;
    R.note('flee: the escape kept failing (' + R.battleNames(bs) + '): fighting instead');
  };
  R.wantFlee = function (bs) {
    const o = R.battleOpts || {};
    if (bs.noEscape || bs._rFleeGaveUp) return false;
    if (typeof bs.canRun === 'function' && !bs.canRun()) return false;       // (a pincer with both sides standing)
    const random = !!(bs.opts && bs.opts.random), scope = random || o.flee === 'all';
    if (!scope) return false;
    const ids = (bs.enemies || []).filter(e => e.targetable || e.alive).map(e => e.id);
    if (o.fleeUnless) { const keep = [].concat(o.fleeUnless); if (!ids.some(id => keep.includes(id))) return true; }
    if (typeof o.fleeIf === 'function') { let v = false; try { v = !!o.fleeIf(bs, R); } catch (e) { v = false; } if (v) return true; }
    if (o.fleeBelow != null) { const pm = (bs.party || []).filter(x => !x.hidden), hp = pm.reduce((a, x) => a + Math.max(0, x.hp), 0), max = pm.reduce((a, x) => a + x.maxHp, 0); if (max && hp < max * o.fleeBelow) return true; }
    return o.flee === true || o.flee === 'random' || o.flee === 'all';
  };
  // plan code during battles (keep it cheap): R.battleHooks.push(fn) - fn(bs, R, 'start' | 'frame' | 'end', record)
  // is called as a battle starts, on each of its frames and when it has ended (with R.lastBattle); or an object
  // { start(bs, R), frame(bs, R), end(bs, R, record) }. A hook that throws is dropped with a note.
  R.battleHooks = R.battleHooks || [];
  R.runBattleHooks = function (when, bs, rec) {
    if (!R.battleHooks.length) return;
    for (const h of R.battleHooks.slice()) {
      try {
        if (typeof h === 'function') h(bs, R, when, rec);
        else if (h && typeof h[when] === 'function') h[when](bs, R, rec);
      } catch (e) { R.note('battle hook (' + when + '): ' + errText(e) + ' - removed'); R.battleHooks = R.battleHooks.filter(x => x !== h); }
    }
  };

  // ---- minigames: the game's own bot plays through FF7.input (js/runner/mgbot.js)
  R.onMinigame = function (sc) {
    if (!sc._runner) {
      const want = R.mgWant && (!R.mgWant.id || R.mgWant.id === sc.def.id) ? R.mgWant : {};
      R.mgWant = null;
      FF7.mgbot.attach(sc, { retry: !!(want.win || want.mustWin) });
      sc._rWant = want; sc._rTries = want.tries || 5;
      R.curMinigame = sc;
      R.say('minigame ' + sc.def.id + (want.win || want.mustWin ? ' (playing to win)' : ''));
    }
    if (sc.botRetry && sc.tries >= sc._rTries) sc.botRetry = false;
    if (!R.fast && (sc.phase === 'help' || sc.phase === 'result') && sc.pt < 150) return;   // the viewer reads it
    FF7.mgbot.buttons(sc).forEach(b => R.hold(b, 1));
  };

  // ---- movies: skipped with Start (Tab) like a player would, the Demo a moment after one starts (opts.movies 'watch' sits through them)
  R.onMovie = function (sc) {
    if (R.opts.movies === 'watch') return;
    // (Start asks "Skip this cutscene?", FF7.qol.MovieSkip: Yes, the first choice, a moment later)
    if (sc.skip && sc.skip.ask) { if (sc.skip.ask.idx !== 0) R.tap('up'); else if (sc.skip.ask.t > (R.fast ? 4 : 16) && R.tap('ok')) R.say('movie ' + (sc.id || (sc.def && sc.def.id) || '') + ': skipped'); return; }
    if ((sc.t || 0) > (R.fast ? 50 : 20)) R.tap('start');
  };

  // ---- limit reels, stopped on the best symbol with an expert's timing: Tifa's (Yeah! = a critical hit on every
  // reel) and Cait Sith's Slots (Game Over, three Cait Siths: every enemy KO'd; or Mog Dance, three Stars, when
  // the party is hurt). The reel steps one symbol every `per` frames and OK stops it on this frame's symbol,
  // after this frame's step, so the press goes in on the frame before the wanted symbol comes up.
  R.reelWant = function (bs, w) {
    if (w.symbols.includes('Yeah!')) return 'Yeah!';
    if (w.symbols.includes('CaitS')) {
      if (w.prev && w.prev.length) return w.prev[0];     // the same picture on every reel
      const hurt = bs.party.some(p => !p.hidden && (!p.alive || p.hp < p.maxHp * 0.4));
      return hurt ? 'Star' : 'CaitS';
    }
    return null;
  };
  R.onReel = function (bs, w) {
    w._rT = (w._rT || 0) + 1;
    if (!R.fast && w._rT < 20) return;                   // the viewer sees it spin first
    const want = R.reelWant(bs, w);
    if (want == null || !w.symbols.includes(want)) { if (R.fast || w._rT > 100) R.tap('ok'); return; }
    const per = Math.max(1, Math.round(12 - w.speed)), next = (w.t + 1) % per === 0 ? (w.idx + 1) % w.symbols.length : w.idx;
    if (w.symbols[next] === want) R.tap('ok');
  };

  R.onGameOver = function () {
    if (R._goSeen) return;
    R._goSeen = true;
    R.stats.gameOvers++;
    const b = R.curBattle ? ' (battle: ' + R.battleNames(R.curBattle) + ')' : '';
    if (R.canRetry()) { R.say('Game Over' + b + ': back to checkpoint ' + R.lastCkpt); R.pendingRestore = null; R.restore(R.lastCkpt, { retry: true }); return; }
    R.issue('gameover', 'Game Over' + b);
  };
  R.canRetry = function () {
    const l = R.lastCkpt;
    return !!(l && R.ckpts[l] && (R.retries[l] || 0) < (R.opts.retries || 0));
  };

  // ================================================================== watchdog
  R.budgetFor = function (step) {
    const o = stepOpts(step);
    const base = { goto: 72000, world: 120000, level: 900000, learnLimits: 900000, limitReady: 3000000, fightUntil: 400000, new: 40000, items: 90000, shop: 40000, kp_train: 900000, kp_league: 6000000, kp_quests: 40000000, kp_heal: 72000, kp_win: 3000000, kp_breedup: 30000000, kp_box: 150000, kp_equip: 60000, kp_upgrade: 3000000, kp_items: 3000000, kp_dex: 400000000, kp_chips: 12000000, kp_rematch: 600000, kp_relearn: 300000 }[step[0]] || 36000;
    return (o.budget || base) * (R.fast ? 1 : 3);
  };
  // a key for "what the game is doing": the same key for too long is a stall
  R.busyKey = function () {
    const top = R.top(), w = R.topModal();
    if (w) { w._rid = w._rid || ++R._ids; return 'w' + w._rid + ':' + (w.page || 0) + ':' + (w.cursor || 0) + ':' + Math.floor(w.shown || 0) + ':' + (w.mode || '') + ':' + (w.idx || 0) + ':' + (w.qty || 0) + ':' + (w.name || '') + ':' + (w.party ? w.party.join() : ''); }
    if (!top) return 'none';
    if (R.isMainMenu(top)) { const p = top.panels[top.panels.length - 1]; return 'menu:' + top.cursor + ':' + top.panels.length + ':' + (p ? [p.mode, p.idx, p.slot, p.row, p.col, p.side, p.tIdx, p.c && p.c.id].join(',') : (top.charSel ? 'c' + top.charSel.idx : '')); }
    if (top.isBattle) return 'b:' + top.phase + ':' + top.turnCount + ':' + (top.victory ? top.victory.page : '') + ':' + top.enemies.map(e => e.hp).join();
    if (top.isMinigame) return 'm:' + top.phase + ':' + Math.floor((top.pt || 0) / 3000);
    if (R.isMovie(top)) return 'movie:' + Math.floor((top.t || 0) / 60000);
    const fs = R.field();
    if (fs) { const p = fs.player; return 'f:' + fs.map.id + ':' + (R.fieldFree(fs) ? 'free:' + R.pc : 'busy:' + (fs.script && fs.script.name)) + ':' + p.tx + ',' + p.ty + ':' + Math.round(p.angle * 10); }
    const ws = R.worldScene();
    if (ws) return 'w:' + Math.floor(ws.px) + ',' + Math.floor(ws.pz) + ':' + (ws.busy ? 'busy' : 'free:' + R.pc) + ':' + Math.round(ws.angle * 10);
    return 'scene:' + (top.constructor && top.constructor.name);
  };
  R.watch = function (busy) {
    const n = R.frames - R.stepStart;
    if (R.stepBudget && n > R.stepBudget) return R.issue('watchdog', 'the step has run ' + n + ' frames (budget ' + R.stepBudget + ')');
    const key = R.busyKey();
    if (key !== R._stallKey) { R._stallKey = key; R._stallN = 0; return; }
    R._stallN++;
    const top = R.top();
    const limit = (R.topModal() ? 4000 : top && top.isBattle ? 5000 : R.isMovie(top) ? 70000 : busy ? 24000 : 12000) * (R.fast ? 1 : 3);
    if (R._stallN > limit) R.issue('stuck', 'nothing has changed for ' + R._stallN + ' frames (' + key.slice(0, 80) + ')');
  };

  // ================================================================== the plan
  R.stepText = function (s) {
    if (!s) return '(end)';
    s = norm(s);
    return s.map(a => typeof a === 'function' ? 'fn' : isObj(a) ? JSON.stringify(a, (k, v) => typeof v === 'function' ? 'fn' : v) : Array.isArray(a) ? JSON.stringify(a) : String(a)).join(' ').slice(0, 120);
  };

  // conditions (expect, done): 'flag' | '!flag' | function (s, R) | [all of...] | { any: [...] } |
  // { flag, map, item, qty, key, materia, member, party, gil, level, got, var, atLeast, equipped: [char, item] }
  R.cond = function (c) {
    const st = FF7.state; if (!st) return false;
    if (c == null) return true;
    if (typeof c === 'string') return c[0] === '!' ? !st.flags[c.slice(1)] : !!st.flags[c];
    if (typeof c === 'function') return !!safe(() => c(R.api(), R));
    if (Array.isArray(c)) return c.every(R.cond);
    if (c.any) return c.any.some(R.cond);
    let ok = true;
    if (c.flag !== undefined) ok = ok && R.cond(c.flag);
    if (c.map) ok = ok && R.where() === c.map;
    if (c.item) ok = ok && FF7.sys.inv.has(c.item, c.qty || 1);
    if (c.key) ok = ok && FF7.sys.inv.hasKey(c.key);
    if (c.materia) ok = ok && R.materiaCount(c.materia) >= (c.qty || 1);
    if (c.member) ok = ok && st.members.includes(c.member);
    if (c.party) ok = ok && c.party.every(id => st.party.includes(id));
    if (c.gil != null) ok = ok && st.gil >= c.gil;
    if (c.level != null) ok = ok && R.avgLevel() >= c.level;
    if (c.got) ok = ok && [].concat(c.got).every(id => st.flags['got_' + id]);
    if (c.var) ok = ok && (st.vars[c.var] || 0) >= (c.atLeast != null ? c.atLeast : 1);
    if (c.equipped) { const ch = st.chars[c.equipped[0]]; ok = ok && !!ch && [ch.weapon, ch.armor, ch.accessory].includes(c.equipped[1]); }
    return ok;
  };
  R.materiaCount = function (id) {
    const st = FF7.state;
    return st.materia.filter(m => m.id === id).length + Object.values(st.chars).reduce((n, c) => n + FF7.sys.materia.equippedList(c).filter(m => m.id === id).length, 0);
  };
  R.equippedMateria = (ch, id) => { const c = FF7.state.chars[ch]; return !!c && FF7.sys.materia.equippedList(c).some(m => m.id === id); };

  // Is a step already done? Its { done } option, or the op's own evidence.
  R.isDone = function (step) {
    const o = stepOpts(step), st = FF7.state;
    if (o.done !== undefined) return R.cond(o.done);
    switch (step[0]) {
      case 'item': case 'chest': return !!st.flags['got_' + step[1]];
      case 'goto': return R.where() === step[1];
      case 'new': return !!R.where();
      case 'materia': return typeof step[2] === 'string' && !(isObj(step[3]) && step[3].index != null) && R.equippedMateria(step[1], step[2]);
      case 'equip': { const c = st.chars[step[1]]; return !!c && c[step[2]] === step[3]; }
      case 'level': return R.avgLevel() >= step[1];
      case 'party': return !stepOpts(step).select && Array.isArray(step[1]) && step[1].every((id, i) => st.party[i] === id);   // a selection is always queued
      case 'row': { const c = st.chars[step[1]]; return !!c && c.row === step[2]; }
      case 'limitLevel': { const c = st.chars[step[1]]; return !!c && typeof step[2] === 'number' && c.limitLevel === step[2]; }
    }
    return false;
  };

  // The map each step is expected to happen on (used to walk there when resuming mid-plan): the step's
  // { map } option, the map that defines its item / chest / NPC, or the last goto / expectMap before it.
  R.contexts = function (plan) {
    const out = [];
    let cur = null;
    plan.forEach((s0) => {
      const s = norm(s0), op = s[0], o = stepOpts(s);
      let m = cur;
      if (op === 'item' || op === 'chest') { const d = R.findPickup(s[1]); if (d) m = d.map; }
      else if (op === 'talk') { const ms = R.npcMaps(s[1]); if (ms.length === 1) m = ms[0]; else if (ms.length && !ms.includes(cur)) m = ms[0]; }
      if (o.map) m = o.map;
      out.push(MAP_OPS.has(op) ? m : null);
      if (op === 'goto' || op === 'expectMap') cur = s[1];
      else if (op === 'world' || op === 'new' || op === 'start' || R.worldOps.has(op)) cur = null;
      else if (MAP_OPS.has(op) && m) cur = m;
      if (o.then) cur = o.then;                      // a step that ends on another map ({ then: mapId })
    });
    return out;
  };
  R.findPickup = function (id) {
    for (const mid in FF7.maps) { const d = FF7.maps[mid]; const it = (d.items || []).concat(d.chests || []).find(x => x.id === id); if (it) return { map: mid, def: it }; }
    return null;
  };
  R.npcMaps = function (id) { const out = []; for (const mid in FF7.maps) if ((FF7.maps[mid].npcs || []).some(n => n.id === id)) out.push(mid); return out; };

  // What a long step is doing, for the Demo's status bar (training and grinding would otherwise look like
  // aimless wandering under the last objective): '' for ordinary steps
  R.activity = function () {
    const s0 = R.plan && R.plan[R.pc]; if (!s0) return '';
    const s = norm(s0), op = String(s[0]), st = FF7.state; if (!st) return '';
    const lv = (Math.round(R.avgLevel() * 10) / 10).toFixed(1), gil = (n) => Number(n).toLocaleString('en-US');
    // in a battle that trains a Limit Break by use: the learners let the enemies hit them to fill their gauge
    const bs = FF7.sceneMgr.top(), lt = R.battleOpts && R.battleOpts.limitTrain;
    if (bs && bs.isBattle && lt && lt.uses !== false && R.limits) {
      const ls = bs.party.filter(x => !x.hidden && x.char && (lt.learners || []).includes(x.id) && (R.limits.need(x.char, lt.upTo || 3) || {}).mode === 'uses');
      if (ls.length) return 'Limit training: letting the enemy hit ' + ls.map(x => x.name + ' (gauge ' + Math.round(100 * (x.limitGauge || 0) / 255) + '%)').join(', ');
    }
    // a Limit trained by kills (limitTrain uses: false, or the kills half): the learner's killing blows
    const killers = lt && bs && bs.isBattle && R.limits ? bs.party.filter(x => !x.hidden && x.char && (lt.learners || []).includes(x.id) && (lt.uses === false ? R.limits.killsNeed(x.char, lt.upTo || 3) > 0 : (R.limits.need(x.char, lt.upTo || 3) || {}).mode === 'kills')) : [];
    const kb = killers.length ? ' · ' + killers.map(x => x.name).join(', ') + ' land the killing blows (Limit training)' : '';
    const levelTo = (n) => 'Training: party level ' + lv + ' → ' + n;
    if (op === 'level') return levelTo(s[1]) + kb;
    // plan-local grinds (<ch>_train (level, gil), <ch>_level, <ch>_grind, <ch>_l5level...)
    if (/(_train|_level|level)$/.test(op) && typeof s[1] === 'number') return levelTo(s[1]) + (typeof s[2] === 'number' && st.gil < s[2] ? ' · gil ' + gil(st.gil) + ' / ' + gil(s[2]) : '') + kb;
    if (/_grind$/.test(op)) return 'Training: party level ' + lv + kb;
    if (op === 'limitReady' || op === 'learnLimits') return 'Training Limit Breaks' + (s[1] ? ': ' + [].concat(s[1]).map(id => (st.chars[id] && st.chars[id].name) || id).join(', ') : '');
    if (op === 'fightUntil') { const fo = isObj(s[2]) ? s[2] : {}, t = typeof fo.activity === 'function' ? safe(() => fo.activity()) : fo.activity; return (t || 'Fighting until the goal is met') + kb; }
    // an Enemy Skill hunt (plan-local <ch>_learn / _eskill / _l4 / _l5 / _chocobuckle, and the Behemoths' ????):
    // which skill, from which enemies
    const esk = (ids) => {
      const L = [].concat(ids || []).filter(id => FF7.data.eskills[id]);
      if (!L.length) return 'Looking for an Enemy Skill';
      const from = [...new Set(L.flatMap(id => FF7.data.eskills[id].learnFrom || []).map(id => (FF7.data.enemies[id] && FF7.data.enemies[id].name) || id))].slice(0, 3);
      return 'Looking for an Enemy Skill: ' + L.map(id => FF7.data.eskills[id].name).join(', ') + (from.length ? ' (from ' + from.join(' / ') + ')' : '');
    };
    if (/_(learn|eskill)$/.test(op)) return esk(s[1]);
    if (/_l4$/.test(op)) return R.l4Training || esk('l4_suicide');   // (R.l4Training: levelling someone to a multiple of 4 first)
    if (/_l5$/.test(op)) return esk('l5_death');
    if (/_chocobuckle$/.test(op)) return esk('chocobuckle');
    if (op === 'c11a_underground') { const o = isObj(s[1]) ? s[1] : {}; if (!R.masterKnows('question')) return esk('question'); const low = FF7.sys.party.active().filter(c => o.min && c.level < o.min); return o.level && (R.avgLevel() < o.level || low.length) ? levelTo(o.level) + (low.length ? ' · ' + low.map(c => c.name + ' ' + c.level + ' → ' + o.min).join(', ') : '') : ''; }
    if (/_morph$/.test(op)) return 'Morphing a Ghost Ship for the Guide Book';
    // steering the battle count onto a number (the Sleeping Man's Mythril: a count ending in 11, 33, 55, 77 or 99)
    if (/_count$/.test(op) && s[1] != null) {
      const ends = [].concat(s[1]).map(Number).sort((x, y) => x - y), n = st.battles || 0, m = n % 100;
      const next = ends.find(e => e >= m); const goal = next != null ? n - m + next : n - m + 100 + ends[0];
      return 'Fighting to bring the battle count to ' + goal + ' (now ' + n + ')';
    }
    if (/_(fund|gp)$/.test(op)) return /_gp$/.test(op) ? 'Earning GP at the Gold Saucer' : 'Earning gil';
    if (/_ninja$/.test(op)) return 'Looking for the Mystery Ninja (Yuffie)';
    if (/_catch$/.test(op)) return 'Catching chocobos';
    if (/_(arena|special)$/.test(op)) return 'Battle Square';
    // chocobo racing for the Chocobo Square's rare prizes (plan_c12a.js), and for Joe's record
    if (op === 'c12a_prizes') { const L = [].concat(s[1] || []).filter(id => R.gear && R.gear.owned(id) === 0).map(id => (FF7.data.materia[id] || {}).name || id); return L.length ? 'Racing for prizes: ' + L.join(', ') : ''; }
    if (op === 'c12a_joe') return st.flags.c12a_joe_record ? '' : "Racing: ten S-class wins in a row (Joe's record)";
    // farming a drop / steal with random battles (the Gaea's Cliff spring's Blue Dragons, the nuts for breeding)
    const inv = (id) => FF7.sys.inv.count(id), iname = (id) => (FF7.data.items[id] || {}).name || id;
    if (op === 'c9_spring') {
      const o = isObj(s[1]) ? s[1] : {}, n = inv('dragon_armlet') + st.members.filter(id => st.chars[id] && st.chars[id].armor === 'dragon_armlet').length;
      return 'Farming Blue Dragons at the spring: Dragon Armlets ' + Math.min(n, o.armlets || 3) + ' / ' + (o.armlets || 3) + (o.level && R.avgLevel() < o.level ? ' · party level ' + lv + ' → ' + o.level : '');
    }
    if (op === 'c12a_nuts') return 'Fighting for ' + iname(s[1]) + 's (chocobo breeding): ' + inv(s[1]) + ' / ' + s[2];
    if (op === 'c12a_blueGreen') return 'Chocobo breeding: a Blue and a Green chocobo (Great × Good, Carob Nut)';
    if (op === 'c12a_black') return 'Chocobo breeding: a Black chocobo (Blue × Green, Carob Nut)';
    if (op === 'c12a_wonderful') return 'Catching a Wonderful chocobo (Icicle Inn tracks) to pair with the Black';
    if (op === 'c12a_gold') return 'Chocobo breeding: the Gold chocobo (Black × Wonderful, Zeio Nut)';
    return R.doing || '';   // (a plan-local op's own text, set while it runs: cleared with its step)
  };
  // Where to carry on in a game already under way: after the last `expect` guard that holds (guards
  // marked { soft: true } don't count).
  R.findResume = function (plan) {
    let r = 0;
    for (let i = 0; i < plan.length; i++) {
      const s = norm(plan[i]);
      if (s[0] === 'todo') break;
      if (s[0] === 'expect' && !(isObj(s[1]) && s[1].soft) && !(isObj(s[2]) && s[2].soft) && R.cond(s[1])) r = i + 1;
    }
    return r;
  };
  // resuming a player's save: a step that fails with "no way" (its map is behind a one-way exit the player has
  // passed) and the steps after it on maps out of reach are passed over, up to the next step on a map that can
  // be reached or the next hard guard (never passed over). Returns true when steps were skipped.
  R.skipOutOfReach = function (reason) {
    if (!/no way from /.test(String(reason))) return false;
    const here = R.where(); if (!here) return false;
    const reach = (m) => !m || m === here || !!R.route(here, m);
    const skipped = [];
    let j = R.pc;
    while (j < R.plan.length) {
      const s = norm(R.plan[j]);
      if (s[0] === 'todo' || (j > R.pc && s[0] === 'expect' && !(isObj(s[2]) && s[2].soft))) break;
      if (j > R.pc && MAP_OPS.has(s[0]) && reach(R.ctx[j])) break;
      if (MAP_OPS.has(s[0])) skipped.push(R.isDone(s) ? null : R.stepText(s));
      j++;
    }
    if (j === R.pc || !skipped.length) return false;
    const missed = skipped.filter(Boolean);
    R.note('resume: steps behind the party (out of reach) passed over' + (missed.length ? '; not done in this game: ' + missed.join('; ') : ' (all already done)'));
    R.pc = j;
    return true;
  };
  // resuming: a goto is skipped when the next unfinished map step (before the next guard) is on this map
  R.pastGoto = function (i) {
    const here = R.where();
    for (let j = i + 1; j < R.plan.length; j++) {
      const s = norm(R.plan[j]);
      if (s[0] === 'todo' || (s[0] === 'expect' && !(isObj(s[2]) && s[2].soft))) return false;
      if (s[0] === 'goto') { if (s[1] === here) return true; continue; }
      if (MAP_OPS.has(s[0]) && !R.isDone(s)) return R.ctx[j] === here;
    }
    return false;
  };
  // the chapter, objective and battle tactics in force at step i
  R.replayState = function (i) {
    for (let k = 0; k < i && k < R.plan.length; k++) {
      const s = norm(R.plan[k]);
      if (s[0] === 'chapter') { R.chapter = s[1]; R.chapterTitle = s[2] || s[1]; R.objective = s[2] || ''; }
      else if (s[0] === 'obj') R.objective = s[1];
      else if (s[0] === 'battle') R.battleOpts = isObj(s[1]) ? Object.assign({}, s[1]) : {};
    }
  };

  R.main = function* () {
    while (R.active && R.pc < R.plan.length) {
      const step = norm(R.plan[R.pc]);
      R.stepStart = R.frames; R.stepBudget = R.budgetFor(step); R._stallN = 0;
      let r;
      if (step[0] !== 'expect' && R.isDone(step)) { R.say('step ' + R.pc + ' ' + R.stepText(step) + ': already done'); r = true; }
      else if (R.resumePending && step[0] === 'goto' && R.pastGoto(R.pc)) { R.say('step ' + R.pc + ' ' + R.stepText(step) + ': resuming past it (the next step is here)'); r = true; }
      else {
        R.say('step ' + R.pc + ': ' + R.stepText(step));
        const ctx = R.ctx[R.pc];
        if (R.resumePending && MAP_OPS.has(step[0])) {
          if (ctx && R.where() !== ctx) { R.say('resume: going to ' + ctx); const g = yield* R.gotoMap(ctx); if (g !== true) { R.issue('resume', 'could not get to ' + ctx + ': ' + g); return; } }
          R.resumePending = false;
        }
        if (R.menuVisible() && R.menus && FF7.state.party.some(id => id && R.gearLater[id]) && R.menus.canOpen()) yield* R.joinGear();
        if (R.preStep) { yield* R.preStep(step); if (!R.active) return; }   // (a chore between steps, before this one's answers are queued: Kupomon's Recycler trip)
        const o = stepOpts(step), pc = R.pc;
        if (o.choose) [].concat(o.choose).forEach(a => R.choices.push({ a, pc }));
        const fn = R.ops[step[0]];
        r = fn ? yield* fn.apply(R, step.slice(1)) : 'unknown op "' + step[0] + '"';
        // a step's own answers ({ choose }) that no question took are dropped with it
        const left = R.choices.filter(c => c.pc === pc);
        if (left.length) { R.note('unused answers of step ' + pc + ': ' + left.map(c => c.a).join(', ')); R.choices = R.choices.filter(c => c.pc !== pc); }
      }
      R.doing = null;
      if (!R.active) return;
      if (r === 'STOP') return;
      // a step that failed but whose goal holds anyway (a scene on the way did it: the trainer fought from his sight
      // line and fled before he could be talked to) is done
      if (r !== true && r !== undefined && step[0] !== 'expect') { const o = stepOpts(step); if (o.done !== undefined && R.cond(o.done)) { R.say('step ' + R.pc + ': ' + r + ', but its goal is met'); r = true; } }
      if (r !== true && r !== undefined) {
        // a game taken over from a save (Esc, --load): what the player left behind and can no longer reach (a
        // pickup behind a one-way drop) is noted and passed over; the Demo carries on from the next reachable step
        if (R.opts.resume && R.skipOutOfReach(r)) continue;
        // retry from the checkpoint (a lost fight or bad luck may go better), but a step that already failed the
        // same way once will fail again (a route problem): stop instead of rewinding over and over
        const fk = R.pc + '|' + String(r).replace(/\d+/g, '#');
        R.stepFails = R.stepFails || {};
        const again = (R.stepFails[fk] = (R.stepFails[fk] || 0) + 1) > 1;
        if (!again && R.canRetry()) { R.say('step failed (' + r + '): back to checkpoint ' + R.lastCkpt); R.pendingRestore = R.lastCkpt; return; }
        R.issue('step', String(r) + (again ? ' (the same failure as before the last retry)' : ''));
        return;
      }
      R.pc++;
    }
  };

  // gear picked for reserve members (O.equip: the Equip screen lists the party only), put on through the Equip
  // screen once they are in the party, then anything better from the bag
  R.gearLater = {};
  R.joinGear = function* () {
    const st = FF7.state;
    for (const id of st.party.filter(x => x && R.gearLater[x])) {
      const c = st.chars[id], want = R.gearLater[id]; delete R.gearLater[id];
      if (!c) continue;
      R.say('joinGear: ' + c.name + ' joined: the gear picked for them');
      const as = Object.keys(want).map(slot => ({ c, slot, id: want[slot] })).filter(a => a.id && c[a.slot] !== a.id && FF7.sys.inv.has(a.id) && FF7.ui.canEquip(c, a.slot, a.id));
      if (as.length) yield* R.gear.equipAll(as);
      yield* R.ops.autoequip({ members: [id] });
    }
    yield* R.menus.finish();
  };

  // wait until the game has been free for k frames in a row
  R.settle = function* (k = 4) { for (let g = 0; g < 100000 && R.freeStreak < k; g++) yield; };

  // ================================================================== field navigation
  function navFor(fs) {
    // (which ones are solid, not how many: a lever that opens one gate as it shuts another keeps the count)
    const sig = Object.keys(fs.blocked || {}).join(';') + '|' + fs.objects.filter(o => o.kind === 'chest' || (o.kind === 'object' && o.solid)).map(o => o.at[0] + ',' + o.at[1]).join(';');
    if (!R.nav || R.nav.fs !== fs || R.nav.gen !== fs.loadGen || R.nav.sig !== sig) R.nav = { fs, gen: fs.loadGen, sig, edges: new Map(), bad: new Set() };
    return R.nav;
  }
  // the game's own collision (FieldScene.canStand) with the NPCs left out
  function withActorsOff(fs, fn) {
    const off = [];
    for (const id in fs.actors) { const a = fs.actors[id]; if (a.solid) { off.push(a); a.solid = false; } }
    try { return fn(); } finally { off.forEach(a => { a.solid = true; }); }
  }
  // can the player walk from the centre of tile a to the centre of tile b? (simulated with tryMove's rules)
  function edgeOK(fs, nav, ax, ay, bx, by) {
    const k = ax + ',' + ay + '>' + bx + ',' + by;
    if (nav.bad.has(k)) return false;
    let v = nav.edges.get(k);
    if (v !== undefined) return v;
    const T = F.TILE, X = (bx + 0.5) * T, Z = (by + 0.5) * T;
    const a = { x: (ax + 0.5) * T, z: (ay + 0.5) * T, radius: fs.player.radius || 0.17 };
    const n = Math.max(3, Math.ceil(Math.hypot(X - a.x, Z - a.z) / 0.035)), sx = (X - a.x) / n, sz = (Z - a.z) / n;
    for (let i = 0; i < n; i++) { if (fs.canStand(a, a.x + sx, a.z)) a.x += sx; if (fs.canStand(a, a.x, a.z + sz)) a.z += sz; }
    v = Math.hypot(a.x - X, a.z - Z) < 0.02;
    nav.edges.set(k, v);
    return v;
  }
  // (for tools: tools/kp_traps.js) can the player walk from tile a to tile b, NPCs left out
  R.edgeOK = (fs, ax, ay, bx, by) => withActorsOff(fs, () => edgeOK(fs, navFor(fs), ax, ay, bx, by));
  R.exitAt = function (fs, x, y) { return (fs.map.exits || []).find(e => fs.inRect(e.at, x, y)) || null; };
  // tiles the path must not use: exits (other than the one wanted), NPCs, the caller's own
  R.fieldBlockers = function (fs, goalSet, o) {
    const out = new Set(), P = fs.P;
    (fs.map.exits || []).forEach(e => {
      if (o.exitOk === true || o.exitOk === e) return;
      const [x0, y0, w, h] = [e.at[0], e.at[1], e.at[2] || 1, e.at[3] || 1];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!goalSet.has(x + ',' + y)) out.add(x + ',' + y);
    });
    if (!o.throughNpcs) for (const id in fs.actors) {
      const a = fs.actors[id]; if (a === fs.player || !a.visible || !a.solid) continue;
      const k = a.tx + ',' + a.ty; if (!goalSet.has(k)) out.add(k);
    }
    if (o.avoid) for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) if (o.avoid(x, y)) out.add(x + ',' + y);
    // one-way ledges (Kupomon's KP.W.ledge: never the only way down) and launch pads: kept off unless the goal, or a
    // walk past one hops (or flies)
    (fs.map.triggers || []).forEach(tr => {
      if (!(tr.ledgeTrig || tr.ledge || tr.kpJump)) return;                // (and launch pads: Cid's dojo)
      const [x0, y0, w, h] = [tr.at[0], tr.at[1], tr.at[2] || 1, tr.at[3] || 1];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!goalSet.has(x + ',' + y)) out.add(x + ',' + y);
    });
    // tiles a map marks as never to be walked on (a map's `avoid` tile types: trapdoors; R.avoidTiles: every map's)
    const avT = fs.map.avoidTiles || R.avoidTiles;
    if (avT) for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const t = P.at(x, y); if (t && avT.includes(t.name)) out.add(x + ',' + y); }   // (not even as the goal: never stood on)
    if (o._fired) o._fired.forEach(k => { if (!goalSet.has(k)) out.add(k); });
    return out;
  };
  // the tiles of the step triggers that fired on this map visit and would fire again when stepped on
  // (repeatable ones; not while standing in one: leaving it doesn't fire it)
  R.firedTiles = function (fs) {
    const out = new Set(), f = R._fired;
    if (!f || f.key !== fs.map.id + ':' + fs.loadGen) return out;
    const pl = fs.player;
    f.list.forEach(tr => {
      const flag = tr.id ? 'trig_' + fs.map.id + '_' + tr.id : null;
      if (tr.once !== false && flag && FF7.state.flags[flag]) return;       // a one-time trigger: done
      if (fs.inRect(tr.at, pl.tx, pl.ty)) return;
      if (tr.if && !safe(() => tr.if(fs.api))) return;
      const [x0, y0, w, h] = [tr.at[0], tr.at[1], tr.at[2] || 1, tr.at[3] || 1];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.add(x + ',' + y);
    });
    return out;
  };
  // scripts that just started: a world-map step hook (its tile is remembered and walks keep off it unless it
  // is their goal) or a field step trigger (kept off for the rest of the map visit unless it is the goal)
  R._hookTiles = R._hookTiles || new Set();
  R.watchScripts = function () {
    const st = FF7.sceneMgr.stack;
    for (let i = st.length - 1; i >= 0; i--) {
      const sc = st[i];
      if (R.isWorld(sc)) {
        const co = sc.script;
        if (co && co !== R._hookSeen && co.name === 'world-hook') {
          R._hookSeen = co;
          const D = R.worldD(), k = mod(Math.floor(sc.px), D.w) + ',' + mod(Math.floor(sc.pz), D.h);
          if (!R._hookTiles.has(k)) { R._hookTiles.add(k); if (R.active) R.say('world: a side place at ' + k + ' (walks keep off it unless it is their goal)'); }
        }
        return;
      }
      if (R.isField(sc)) {
        const co = sc.script;
        if (co && co !== R._trigSeen && /^trigger /.test(co.name || '')) {
          R._trigSeen = co;
          const pl = sc.player, key = sc.map.id + ':' + sc.loadGen;
          if (!R._fired || R._fired.key !== key) R._fired = { key, list: [] };
          (sc.map.triggers || []).forEach(tr => { if (tr.on !== 'talk' && tr._inside && sc.inRect(tr.at, pl.tx, pl.ty) && !R._fired.list.includes(tr)) R._fired.list.push(tr); });
        }
        return;
      }
    }
  };
  // world-map tiles with a step hook: seen firing (R._hookTiles), or declared by the hook (fn.tiles = [[x, y]...])
  R.hookTiles = function () {
    const out = new Set(R._hookTiles), D = R.worldD();
    (FF7.world.stepHooks || []).forEach(h => (h && Array.isArray(h.tiles) ? h.tiles : []).forEach(t => out.add(mod(t[0], D.w) + ',' + mod(t[1], D.h))));
    return out;
  };
  // A* over the tiles (8 ways), from the player's tile to any goal tile: [[x, y], ...] (goal last), [] if there already.
  // Keeps off the step triggers that already fired on this visit (R.firedTiles) when it can; o.throughTriggers: never mind
  R.fieldPath = function (fs, goals, o = {}) {
    const fired = o.throughTriggers || o._fired ? null : R.firedTiles(fs);
    if (fired && fired.size) { const p = fieldPath0(fs, goals, Object.assign({}, o, { _fired: fired })); if (p) return p; }
    return fieldPath0(fs, goals, o);
  };
  const fieldPath0 = function (fs, goals, o = {}) {
    const P = fs.P, W = P.w, H = P.h, pl = fs.player, nav = navFor(fs);
    const sx = pl.tx, sy = pl.ty;
    const goalSet = new Set(goals.map(g => g[0] + ',' + g[1]));
    if (goalSet.has(sx + ',' + sy)) return [];
    const block = R.fieldBlockers(fs, goalSet, o);
    // launch pads (Cid's dojo: a trigger with kpJump): stepping on one throws the party to its landing, so a pad is a
    // one-way link there (a walk replans from the landing once the throw is over)
    const pads = new Map();
    (fs.map.triggers || []).forEach(tr => { if (tr.kpJump && !(tr.if && !safe(() => tr.if(R.api())))) pads.set(tr.at[0] + ',' + tr.at[1], tr.kpJump); });
    const hOf = (x, y) => { let b = Infinity; for (const g of goals) { const dx = Math.abs(g[0] - x), dy = Math.abs(g[1] - y); b = Math.min(b, Math.max(dx, dy) + 0.414 * Math.min(dx, dy)); } return b; };
    const wallPen = (x, y) => ((P.walkable(x + 1, y) ? 0 : 1) + (P.walkable(x - 1, y) ? 0 : 1) + (P.walkable(x, y + 1) ? 0 : 1) + (P.walkable(x, y - 1) ? 0 : 1)) * 0.15;
    return withActorsOff(fs, () => {
      const N = W * H, g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
      const heap = [];
      const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      const s0 = sy * W + sx;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
      g[s0] = 0; push(hOf(sx, sy), s0);
      let found = -1, n = 0;
      while (heap.length && n++ < 60000) {
        const [, i] = pop();
        if (closed[i]) continue;
        closed[i] = 1;
        const x = i % W, y = (i / W) | 0;
        if (goalSet.has(x + ',' + y)) { found = i; break; }
        const pad = i !== s0 && pads.get(x + ',' + y);
        if (pad) {
          const j = pad[1] * W + pad[0], ng = g[i] + 3;
          if (!closed[j] && ng < g[j]) { g[j] = ng; came[j] = i; push(ng + hOf(pad[0], pad[1]), j); }
          continue;
        }
        for (const [dx, dy] of DIRS8) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          const isPad = pads.has(nx + ',' + ny);
          if (closed[j] || !P.walkable(nx, ny) || (block.has(nx + ',' + ny) && !isPad)) continue;
          if (dx && dy && (isPad || block.has(x + ',' + ny) || block.has(nx + ',' + y))) continue;   // (a pad straight on)
          if (!edgeOK(fs, nav, x, y, nx, ny)) continue;
          const ng = g[i] + (dx && dy ? 1.414 : 1) + wallPen(nx, ny);
          if (ng < g[j]) { g[j] = ng; came[j] = i; push(ng + hOf(nx, ny), j); }
        }
      }
      if (found < 0) return null;
      const path = [];
      for (let i = found; i !== s0 && i >= 0; i = came[i]) path.push([i % W, (i / W) | 0]);
      return path.reverse();
    });
  };

  // one frame of steering toward (tx, tz) metres: the input direction that makes the most progress
  // keepK: the direction held last frame, kept while it is nearly as good (a player holds one direction;
  // holdK: kept while it moves at all toward the target (walkField checked the dog-leg is clear);
  // re-picking every frame flips between two neighbours on an angled line and the body snaps back and forth)
  R.steerField = function (fs, tx, tz, run, avoidK, keepK, holdK) {
    const pl = fs.player, dx = tx - pl.x, dz = tz - pl.z, dd = Math.hypot(dx, dz), d = dd || 1;
    const yaw = fs.cam.yaw || 0, sp = run ? 0.072 : 0.036;
    let best = null, bs = -9;
    const sc = [];
    DIRS8.forEach((dir, k) => {
      if (k === avoidK) return;
      const v = fieldVec(dir[0], dir[1], yaw);
      const aim = (v[0] * dx + v[1] * dz) / d;
      const mx = fs.canStand(pl, pl.x + v[0] * sp, pl.z) ? v[0] : 0;
      const mz = fs.canStand(pl, pl.x + mx * sp, pl.z + v[1] * sp) ? v[1] : 0;
      const s = sc[k] = (mx * dx + mz * dz) / d + aim * 0.02;
      if (s > bs) { bs = s; best = k; }
    });
    if (best == null) return -1;
    if (keepK != null && keepK >= 0 && keepK !== avoidK && dd > 0.15 && sc[keepK] > 0.8 && sc[keepK] > bs - 0.07) best = keepK;
    if (holdK != null && holdK >= 0 && holdK !== avoidK && sc[holdK] > 0.69) best = holdK;   // a clear dog-leg (walkField)
    R.dirHold(DIRS8[best], run);
    return best;
  };

  // Walk to any of the goal tiles on the current field map. o: { near (metres from the tile centre),
  // anywhere (any spot in the tile), exitOk (an exit that may be stepped on, or true), run (default
  // true), throughNpcs, avoid(x, y) }. Returns true, 'mapchanged' or a reason.
  R.walkField = function* (goals, o = {}) {
    const fs0 = R.field(); if (!fs0) return 'not on a field map';
    const map0 = fs0.map.id, gen0 = fs0.loadGen, T = F.TILE;
    let path = null, i = 0, replans = 0, best = Infinity, sinceBest = 0, wiggle = 0, wiggleK = -1, lastPos = null, still = 0, blk = new Set();
    for (let guard = 0; guard < 200000; guard++) {
      const fs = R.field();
      if (!fs || fs.map.id !== map0 || fs.loadGen !== gen0) return 'mapchanged';
      const pl = fs.player;
      // heading into an exit whose script moved the party elsewhere on this map (a ladder, a lift): done (not a hop the
      // path itself planned: a launch pad's flight or a ledge, landing on the path)
      if (o.exitOk && R.gap && lastPos && Math.hypot(pl.x - lastPos[0], pl.z - lastPos[1]) > T * 1.5 && !(path && path.some(q => q[0] === pl.tx && q[1] === pl.ty))) return 'moved';
      const onGoal = goals.some(g => g[0] === pl.tx && g[1] === pl.ty);
      if (onGoal && (o.anywhere || Math.hypot(pl.x - (pl.tx + 0.5) * T, pl.z - (pl.ty + 0.5) * T) < (o.near || 0.1))) return true;
      if (o.until && o.until()) return 'until';                    // the caller's condition came true on the way
      if (!path || R.gap) {
        path = R.fieldPath(fs, goals, o) || (o.throughNpcs ? null : R.fieldPath(fs, goals, Object.assign({}, o, { throughNpcs: true })));
        i = 0; best = Infinity; sinceBest = 0;
        blk = R.fieldBlockers(fs, new Set(goals.map(q => q[0] + ',' + q[1])), o);   // tiles the look-ahead keeps off
        (fs.map.triggers || []).forEach(tr => { if (tr.on) return; const [x0, y0, w, h] = [tr.at[0], tr.at[1], tr.at[2] || 1, tr.at[3] || 1]; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) blk.add(x + ',' + y); });
        if (!path && !o._recentered) {
          // (no way on from here: the body may have been wedged against a ledge beside a stair, and every step out of
          // this tile marked bad while it was: back to the tile's centre, those marks forgotten, and plan once more)
          if (Math.hypot(pl.x - (pl.tx + 0.5) * T, pl.z - (pl.ty + 0.5) * T) > 0.05 * T) {
            const rc = yield* R.walkField([[pl.tx, pl.ty]], Object.assign({}, o, { near: 0.04, _recentered: true }));
            if (rc === 'mapchanged') return rc;
          }
          const f2 = R.field(); if (!f2) return 'mapchanged';
          const nav = navFor(f2), here = f2.player.tx + ',' + f2.player.ty + '>';
          for (const k of Array.from(nav.bad)) if (k.startsWith(here)) nav.bad.delete(k);
          return yield* R.walkField(goals, Object.assign({}, o, { _recentered: true }));
        }
        if (!path) return 'no path from ' + pl.tx + ',' + pl.ty + ' to ' + goals.slice(0, 4).map(g => g.join(',')).join(' / ') + (goals.length > 4 ? ' ...' : '') + ' on ' + map0;
        if (!path.length) path = [[pl.tx, pl.ty]];
      }
      for (let k = Math.min(path.length - 1, i + 5); k > i; k--) if (path[k][0] === pl.tx && path[k][1] === pl.ty) { i = k; break; }
      let tx = (path[i][0] + 0.5) * T, tz = (path[i][1] + 0.5) * T, d = Math.hypot(tx - pl.x, tz - pl.z);
      while (i < path.length - 1 && d < 0.17) { i++; tx = (path[i][0] + 0.5) * T; tz = (path[i][1] + 0.5) * T; d = Math.hypot(tx - pl.x, tz - pl.z); }
      const last = i >= path.length - 1;
      // look ahead: the farthest of the next path tiles reached in a straight line (a body's width either side)
      // over the path's own tiles or open floor the path could have used (same level, no NPC, exit or trigger),
      // so it heads across the floor holding one direction instead of from tile centre to tile centre
      // A stair is only entered or left along its flight (FieldScene.canStand's rule: a line that crosses a
      // stair's side hangs over its railing), and the ground never jumps between samples (a ledge).
      const P = fs.P;
      const stairSide = (ax, ay, bx, by) => {
        const A = P.at(ax, ay), B2 = P.at(bx, by), sa = A.stair && !A.steps, sb = B2.stair && !B2.steps;
        if (sa === sb) return false;                               // both on the flight, or neither a stair
        const [sx, sy] = sa ? [ax, ay] : [bx, by], si = F.stairInfo(P, sx, sy);
        return si.axis === 'z' ? ax !== bx : si.axis === 'x' ? ay !== by : false;
      };
      // (FieldScene.canStand: the body's corners, x +-r and z +-0.6r, may not stand more than 0.2 above or below
      // its centre off a stair, nor on a blocked or unwalkable tile - raised pads, catwalks, platforms)
      const rr = pl.radius || 0.17, foot = [[-rr, -rr * 0.6], [rr, -rr * 0.6], [-rr, rr * 0.6], [rr, rr * 0.6]];
      const footOK = (qx, qz, h) => {
        if (P.at(Math.floor(qx / T), Math.floor(qz / T)).stair) return true;
        for (const [ax, az] of foot) {
          const tx = Math.floor((qx + ax) / T), ty = Math.floor((qz + az) / T), t = P.at(tx, ty);
          if (!t.walk || (fs.blocked && fs.blocked[tx + ',' + ty])) return false;
          if (!t.stair && Math.abs(F.groundAt(P, qx + ax, qz + az) - h) > 0.2) return false;
        }
        return true;
      };
      const lineClear = (x0, z0, x1, z1, on) => {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.1), ux = (x1 - x0) / (L || 1), uz = (z1 - z0) / (L || 1);
        for (const off of [-0.12, 0, 0.12]) {
          let px0 = Math.floor(x0 / T), py0 = Math.floor(z0 / T), h0 = F.groundAt(P, x0 - uz * off, z0 + ux * off);
          for (let m = 1; m <= n; m++) {
            const qx = x0 + (x1 - x0) * m / n - uz * off, qz = z0 + (z1 - z0) * m / n + ux * off;
            const h = F.groundAt(P, qx, qz);
            if (Math.abs(h - h0) > 0.2) return false;
            if (off === 0 && !footOK(qx, qz, h)) return false;
            h0 = h;
            const cx = Math.floor(qx / T), cy = Math.floor(qz / T), key = cx + ',' + cy;
            if (cx === px0 && cy === py0) continue;
            if (stairSide(px0, py0, cx, cy)) return false;
            if (!on.has(key) && !(P.walkable(cx, cy) && !blk.has(key) && withActorsOff(fs, () => edgeOK(fs, navFor(fs), px0, py0, cx, cy)))) return false;   // actors off, as in fieldPath (the edge cache is shared: an edge probed against the player's own body was cached as blocked for good)
            px0 = cx; py0 = cy;
          }
        }
        return true;
      };
      let on = null;
      for (let k = Math.min(path.length - 1, i + 8); k > i; k--) {
        const set = new Set(); for (let q = Math.max(0, i - 1); q <= k; q++) set.add(path[q][0] + ',' + path[q][1]);
        const ax = (path[k][0] + 0.5) * T, az = (path[k][1] + 0.5) * T;
        if (lineClear(pl.x, pl.z, ax, az, set)) { tx = ax; tz = az; d = Math.hypot(ax - pl.x, az - pl.z); on = set; break; }
      }
      // like a player: hold the key already held (a diagonal, say) while the target is still within 45 degrees of
      // it and the dog-leg (this key, then the neighbouring one straight to the target) is clear; one turn per leg
      let hold = -1;
      const lk = R._lastK;
      if (on && lk != null && lk >= 0 && d > 0.2) {
        const yaw = fs.cam.yaw || 0, u = fieldVec(DIRS8[lk][0], DIRS8[lk][1], yaw), ex = tx - pl.x, ez = tz - pl.z;
        const cr = u[0] * ez - u[1] * ex, j = (lk + (cr > 0 ? 1 : 7)) % 8, w = fieldVec(DIRS8[j][0], DIRS8[j][1], yaw);
        const det = u[0] * w[1] - u[1] * w[0], a = (ex * w[1] - ez * w[0]) / det, b = (u[0] * ez - u[1] * ex) / det;
        if (a > 0.05 && b >= -0.02) { const kx = pl.x + u[0] * a, kz = pl.z + u[1] * a; if (lineClear(pl.x, pl.z, kx, kz, on) && lineClear(kx, kz, tx, tz, on)) hold = lk; }
      }
      // progress watch: toward the end of the path
      const g = path[path.length - 1], left = Math.hypot((g[0] + 0.5) * T - pl.x, (g[1] + 0.5) * T - pl.z) + (path.length - 1 - i) * T;
      if (left < best - 0.02) { best = left; sinceBest = 0; } else sinceBest++;
      const moved = lastPos ? Math.hypot(pl.x - lastPos[0], pl.z - lastPos[1]) : 1; lastPos = [pl.x, pl.z];
      still = moved < 0.002 ? still + 1 : 0;
      if (sinceBest > 50 || still > 20) {
        if (wiggle <= 0 && sinceBest < 400) { wiggle = 14; wiggleK = (R._lastK != null ? R._lastK : 0); sinceBest = 40; }
        else {
          // mark the edge ahead as bad and plan again
          const from = [pl.tx, pl.ty], to = path[i];
          if (to) navFor(fs).bad.add(from[0] + ',' + from[1] + '>' + to[0] + ',' + to[1]);
          path = null; replans++; wiggle = 0; still = 0;
          if (replans > 8) return 'stuck at ' + pl.tx + ',' + pl.ty + ' on ' + map0 + ' going to ' + goals[0].join(',');
          yield; continue;
        }
      }
      if (wiggle > 0) {
        wiggle--;
        const perp = DIRS8[(wiggleK + (wiggle > 7 ? 2 : 6)) % 8];
        R.dirHold(perp, false);
      } else {
        const fine = (o.near || 0.1) < 0.08;             // a precise line-up walks the last bit
        R._lastK = R.steerField(fs, tx, tz, o.run !== false && !(last && d < (fine ? 0.2 : 0.08)), -1, R._lastK, hold);
      }
      yield;
    }
    return 'walk: gave up';
  };

  // ---- interacting: what OK would do from (px, pz) facing `ang` (FieldScene.interact, mirrored)
  R.probe = function (fs, px, pz, ang) {
    const T = F.TILE, fx = px + Math.sin(ang) * 0.42, fz = pz + Math.cos(ang) * 0.42;
    let best = null, bd = 0.5;
    for (const id in fs.actors) {
      const a = fs.actors[id];
      if (a === fs.player || !a.visible || !a.def) continue;
      const d = Math.hypot(a.x - fx, a.z - fz);
      if (d < bd && (a.def.talk || a.def.onTalk)) { best = a; bd = d; }
    }
    if (best) return { kind: 'npc', actor: best };
    for (const o of fs.objects) {
      const ox = (o.at[0] + 0.5) * T, oz = (o.at[1] + 0.5) * T;
      const d = Math.hypot(ox - fx, oz - fz);
      if (d > 0.5 && !(o.kind === 'item' && Math.hypot(ox - px, oz - pz) < 0.4)) continue;
      if (o.kind === 'item') return { kind: 'item', o };
      if (o.kind === 'chest' && !o.open) return { kind: 'chest', o };
      if (o.kind === 'object' && o.talk) { if (o.if && !safe(() => o.if(fs.api))) continue; return { kind: 'object', o }; }
    }
    const ftx = Math.floor(fx / T), fty = Math.floor(fz / T);
    for (const tr of fs.map.triggers || []) {
      if (tr.on !== 'talk' || !fs.inRect(tr.at, ftx, fty)) continue;
      if (tr.if && !safe(() => tr.if(fs.api))) continue;
      return { kind: 'trigger', tr };
    }
    return null;
  };
  // tiles (and facings) from which OK reaches the target
  R.standSpots = function (fs, match, cx, cy, r) {
    const P = fs.P, T = F.TILE, yaw = fs.cam.yaw || 0, out = [];
    const angs = DIRS8.map(([ix, iy]) => { const v = fieldVec(ix, iy, yaw); return Math.atan2(v[0], v[1]); });
    const taken = new Set();
    for (const id in fs.actors) { const a = fs.actors[id]; if (a !== fs.player && a.visible && a.solid) taken.add(a.tx + ',' + a.ty); }
    fs.objects.forEach(o => { if (o.kind === 'chest' || (o.kind === 'object' && o.solid)) taken.add(o.at[0] + ',' + o.at[1]); });
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!P.walkable(x, y) || (fs.blocked && fs.blocked[x + ',' + y]) || taken.has(x + ',' + y) || R.exitAt(fs, x, y)) continue;
      const px = (x + 0.5) * T, pz = (y + 0.5) * T;
      for (let k = 0; k < 8; k++) { const sel = R.probe(fs, px, pz, angs[k]); if (sel && match(sel)) out.push({ x, y, k, ang: angs[k] }); }
    }
    return out;
  };
  // Walk up to something and press OK. match(sel) says whether a probe result is the target; center(fs)
  // gives its tile. Returns true once OK started something (or o.check() holds).
  R.interact = function* (what, match, center, o = {}) {
    let lastErr = what + ': could not reach it';
    for (let attempt = 0; attempt < 6; attempt++) {
      let fs = R.field(); if (!fs) return what + ': not on a field map';
      const c = center(fs); if (!c) return what + ' is not here (' + fs.map.id + ')';
      const spots = R.standSpots(fs, match, c[0], c[1], o.radius || 3).filter(sp => !o.from || (sp.x === o.from[0] && sp.y === o.from[1]));   // o.from: that tile only
      if (!spots.length) return what + ': no spot to reach it from';
      const tiles = []; const seen = new Set();
      spots.forEach(s => { const k = s.x + ',' + s.y; if (!seen.has(k)) { seen.add(k); tiles.push([s.x, s.y]); } });
      const r = yield* R.walkField(tiles, { near: 0.12 });
      if (r === 'mapchanged') return r;
      if (r !== true) { lastErr = what + ': ' + r; continue; }
      fs = R.field(); if (!fs) return 'mapchanged';
      const pl = fs.player;
      const want = Math.atan2((c[0] + 0.5) * F.TILE - pl.x, (c[1] + 0.5) * F.TILE - pl.z);
      const here = spots.filter(s => s.x === pl.tx && s.y === pl.ty).sort((a, b) => Math.abs(angWrap(a.ang - want)) - Math.abs(angWrap(b.ang - want)));
      const face = here.find(s => { const sel = R.probe(fs, pl.x, pl.z, s.ang); return sel && match(sel); });
      if (!face) { lastErr = what + ': could not line up with it'; yield* R.walkField([[pl.tx, pl.ty]], { near: 0.03 }); continue; }
      if (Math.abs(angWrap(pl.angle - face.ang)) > 0.02) {
        R.dirHold(DIRS8[face.k], false); yield;              // a tap turns the body (and moves it a hair)
        for (let t = 0; t < 30; t++) { const f2 = R.field(); if (!f2 || Math.abs(angWrap(f2.player.angle - f2.player.targetAngle)) < 0.001) break; yield; }
        fs = R.field(); if (!fs) return 'mapchanged';
        const sel = R.probe(fs, fs.player.x, fs.player.z, fs.player.angle);
        if (!sel || !match(sel)) { lastErr = what + ': turned away from it'; continue; }
      }
      const b0 = R.busyFrames;
      for (let g = 0; g < 4 && !R.tap('ok'); g++) yield;
      yield; yield;
      if (R.busyFrames > b0 || (o.check && o.check())) return true;
      lastErr = what + ': OK did nothing';
    }
    return lastErr;
  };

  // ================================================================== routes between maps
  // map ids a script can lead to: s.goto('id'), s.world(...) -> 'world', and FF7.story.* it runs
  const targetCache = new WeakMap();
  R.scriptTargets = function (fn, depth = 0, out) {
    if (typeof fn !== 'function' || depth > 3) return out || new Set();
    if (!out && targetCache.has(fn)) return targetCache.get(fn);
    const set = out || new Set();
    const src = String(fn);
    // s.goto('id', ...) and s.goto(C3.plate(s) ? 'a' : 'b', ...): every map id quoted in the call's
    // arguments (read to the matching parenthesis, so a condition's own calls don't cut it short)
    for (const arg of R.callArgs(src, '.goto(')) for (const q of arg.matchAll(/['"]([\w-]+)['"]/g)) if (FF7.maps[q[1]]) set.add(q[1]);
    if (/\.world\(/.test(src)) set.add('world');
    for (const m of src.matchAll(/FF7\.story\.(\w+)/g)) { const f = FF7.story[m[1]]; if (f && f !== fn) R.scriptTargets(f, depth + 1, set); }
    if (!out) targetCache.set(fn, set);
    return set;
  };
  // the argument text of every call `name(...)` in src, up to its matching parenthesis (strings skipped)
  R.callArgs = function (src, name) {
    const out = [];
    for (let i = src.indexOf(name); i >= 0; i = src.indexOf(name, i + 1)) {
      let depth = 1, j = i + name.length, q = null;
      for (; j < src.length && depth > 0; j++) {
        const ch = src[j];
        if (q) { if (ch === '\\') j++; else if (ch === q) q = null; continue; }
        if (ch === '"' || ch === "'" || ch === '`') q = ch;
        else if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      out.push(src.slice(i + name.length, j - 1));
    }
    return out;
  };
  R.mapEdges = function (id) {
    const api = R.api(), out = [];
    if (id === 'world') {
      const links = FF7.world._links || {};
      for (const loc in links) {
        const L = FF7.world.linkFor(loc, api); if (!L) continue;
        if (L.map) out.push({ to: L.map, kind: 'loc', loc });
        else if (L.run) R.scriptTargets(L.run).forEach(t => out.push({ to: t, kind: 'loc', loc, guess: true }));
      }
      return out;
    }
    const def = FF7.maps[id]; if (!def) return out;
    (def.exits || []).forEach((ex, i) => {
      const open = !ex.if || safe(() => ex.if(api));
      if (!open) return;
      if (ex.to === 'world') out.push({ to: 'world', kind: 'exit', exit: ex, i });
      else if (ex.to) out.push({ to: ex.to, kind: 'exit', exit: ex, i });
      else if (ex.run) R.scriptTargets(ex.run).forEach(t => out.push({ to: t, kind: 'exit', exit: ex, i, guess: true }));
    });
    if (def.onEnter) R.scriptTargets(def.onEnter).forEach(t => out.push({ to: t, kind: 'auto', guess: true }));
    // a map's travel links: someone to talk to who takes the party to another map (a ferry's sailor):
    // def.links: [{ to, npc, choose, if }]
    (def.links || []).forEach(l => { if (!l.if || safe(() => l.if(api))) out.push({ to: l.to, kind: 'talk', link: l }); });
    return out;
  };
  // cheapest route (Dijkstra over maps): [{ from, to, kind, exit | loc }, ...]
  // dead: Set of 'map>auto' edges seen not to fire (an arrival script whose condition is false now)
  R.route = function (from, to, dead) {
    const cost = { exit: 1, auto: 1, loc: 4, talk: 2 };
    const dist = { [from]: 0 }, prev = {}, done = new Set();
    let reach;                                        // (R.worldReach, worked out when a world link is weighed)
    // (from where the route comes out on the world map: the exit's location, else where the party is / left it)
    const unreachable = (e) => {
      if (reach === undefined) {
        const pe = from === 'world' ? null : prev.world, Lx = pe && pe.exit && pe.exit.loc ? FF7.world.location(pe.exit.loc) : null;
        try { reach = R.worldReach(Lx ? { x: Lx.x, y: Lx.y } : null); } catch (err) { reach = null; }
      }
      return !!(reach && !reach.all && e.loc && !reach.locs.has(e.loc));
    };
    for (let n = 0; n < 2000; n++) {
      let u = null, bd = Infinity;
      for (const k in dist) if (!done.has(k) && dist[k] < bd) { bd = dist[k]; u = k; }
      if (u == null) return null;
      if (u === to) break;
      done.add(u);
      for (const e of R.mapEdges(u)) {
        if (!FF7.maps[e.to] && e.to !== 'world') continue;
        if (dead && e.kind === 'auto' && dead.has(u + '>auto')) continue;
        if (dead && e.kind === 'exit' && dead.has(u + '>exit' + e.i)) continue;
        const c = bd + cost[e.kind] + (e.guess ? 0.5 : 0) + (u === 'world' && e.kind === 'loc' && unreachable(e) ? 500 : 0);
        if (dist[e.to] == null || c < dist[e.to]) { dist[e.to] = c; prev[e.to] = Object.assign({ from: u }, e); }
      }
    }
    if (dist[to] == null) return null;
    const out = [];
    for (let k = to; k !== from; k = prev[k].from) out.unshift(prev[k]);
    return out;
  };

  // Get to a map by walking its exits (and the world map), whatever it takes. o is passed to the walks.
  // Every hop is planned from wherever the party is now (a story scene may have moved it). An arrival
  // script's goto only counts while it fires: standing free on that map means its condition is false, so
  // that edge is dropped and the route planned again. When the party was on the target at any moment since
  // the goto began (a scene took it through), the goto is done.
  R.gotoMap = function* (target, o = {}) {
    const f0 = R.frames, dead = new Set(), moved = {};
    const passed = () => (R._mapLog || []).some(([f, m]) => f >= f0 && f > (R._sideEnd || 0) && m === target);   // (a side trip's way back doesn't count)
    for (let hop = 0; hop < 80; hop++) {
      yield;   // (a frame a hop at least: a settled runner's settle doesn't wait, and a hop that fails at once spun through all 80)
      yield* R.settle(3);
      if (o.stop && o.stop()) return 'stopped';   // (the caller's reason to stop walking)
      // (a menu, a fade or a scene on top of the field: back to it first, not an exit tried from under it, which came
      // back 'mapchanged' at once: the user saw every sidequest fail in one frame, "too many hops")
      if (!R.field() && !R.worldScene()) { for (let w = 0; w < 900 && !R.field() && !R.worldScene(); w++) yield; if (!R.field() && !R.worldScene()) return 'not back on the field'; }
      const here = R.where();
      if (here === target) return true;
      if (!here) return 'not on a map';
      if (passed()) { R.say('route: the story took the party through ' + target + ' (now on ' + here + ')'); return true; }
      if (R.flyHook) { const fl = yield* R.flyHook(here, target); if (fl === true || R.where() !== here) continue; }   // (a quicker way there: Kupomon's Big Mog; somewhere else after it, flown or not: planned again from there)
      const route = R.route(here, target, dead);
      if (!route) return 'no way from ' + here + ' to ' + target;
      const e = route[0];
      R.say('route ' + here + ' -> ' + e.to + ' (' + e.kind + (e.loc ? ' ' + e.loc : '') + ')' + (route.length > 1 ? ' ... ' + target : ''));
      let r;
      if (here === 'world') r = yield* R.worldTo(e.loc, o);
      else if (e.kind === 'auto') { r = yield* R.waitMapChange(here, 90); if (r !== 'mapchanged') { dead.add(here + '>auto'); R.say('route: ' + here + "'s arrival script doesn't go on now"); continue; } }
      else if (e.kind === 'talk') {   // (a travel link: talk to them, say yes, and wait to be taken there)
        [].concat(e.link.choose || []).forEach(a => R.choices.push({ a, pc: -3 }));
        try { r = yield* O.talk(e.link.npc, {}); } finally { R.choices = R.choices.filter(c => c.pc !== -3); }
        if (R.where() === here && r === true) r = yield* R.waitMapChange(here, 600);
        if (R.where() !== here) r = 'mapchanged';
      }
      else {
        r = yield* R.takeExit(e.exit, o);
        if (r === 'moved') { const k = here + '>exit' + e.i; moved[k] = (moved[k] || 0) + 1; if (moved[k] >= 2) dead.add(k); continue; }   // (a script exit within the map: planned again from there)
      }
      if (r !== true && r !== 'mapchanged') { if (passed()) return true; return r; }
    }
    return 'too many hops';
  };
  R.waitMapChange = function* (here, frames) {
    const f0 = R.frames;
    while (R.frames - f0 < frames) { if (R.where() !== here) return 'mapchanged'; yield; }
    return 'the map did not change by itself (' + here + ')';
  };
  // walk into an exit's rectangle and wait for it to take us away
  R.takeExit = function* (ex, o = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const fs = R.field(); if (!fs) return 'mapchanged';
      const map0 = fs.map.id, gen0 = fs.loadGen;
      const [x0, y0, w, h] = [ex.at[0], ex.at[1], ex.at[2] || 1, ex.at[3] || 1];
      const tiles = [];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (fs.P.walkable(x, y)) tiles.push([x, y]);
      if (!tiles.length) return 'exit at ' + ex.at.join(',') + ' has no floor';
      if (fs.inRect(ex.at, fs.player.tx, fs.player.ty)) {             // standing on it already (arrived there): step off first
        const off = []; for (const [dx, dy] of DIRS8) { const x = fs.player.tx + dx, y = fs.player.ty + dy; if (fs.P.walkable(x, y) && !R.exitAt(fs, x, y)) off.push([x, y]); }
        if (off.length) { const r0 = yield* R.walkField(off, Object.assign({}, o, { anywhere: true })); if (r0 === 'mapchanged') return r0; }
      }
      const r = yield* R.walkField(tiles, Object.assign({}, o, { exitOk: ex, anywhere: true }));
      if (r === 'mapchanged') return r;
      if (r === 'moved') { R.say('exit at ' + ex.at.join(',') + ': the party was moved within ' + map0); return 'moved'; }
      if (r !== true) return 'exit to ' + (ex.to || 'script') + ': ' + r;
      // (an exit whose script moves the party elsewhere on this map - a ladder, a lift - is 'moved': done)
      const f0 = R.frames, b0 = R.busyFrames, p0 = [fs.player.x, fs.player.z];
      while (R.frames - f0 < 240) {
        const f = R.field(); if (!f || f.map.id !== map0 || f.loadGen !== gen0) return 'mapchanged';
        if (R.busyFrames > b0 && R.fieldFree(f) && !f.inRect(ex.at, f.player.tx, f.player.ty) && Math.hypot(f.player.x - p0[0], f.player.z - p0[1]) > F.TILE * 1.5) { R.say('exit at ' + ex.at.join(',') + ': the party was moved within ' + map0); return 'moved'; }
        yield;
      }
      R.note('exit at ' + ex.at.join(',') + ' on ' + map0 + ' did not lead anywhere (try ' + (attempt + 1) + ')');
    }
    return 'exit at ' + ex.at.join(',') + ' is closed';
  };

  // ================================================================== world map navigation
  R.worldD = () => FF7.data.world;
  R.entries = function () {
    const D = R.worldD();
    if (!R._entry || R._entryD !== D) { R._entry = {}; D.locations.forEach(L => { R._entry[mod(L.x, D.w) + ',' + mod(L.y, D.h)] = L; }); R._entryD = D; }
    return R._entry;
  };
  // can this vehicle (null = on foot) stand on tile x, y? (WorldScene.canEnter)
  // (with ws null - planning from a field map - the world scene's own rule is asked through a stand-in)
  const stubWS = { vehicle: null, dived: false };
  R.worldCan = function (ws, vehicle, x, y) {
    if (!ws) { const I = FF7.world._internals; if (I && I.D !== FF7.data.world) I.init(); stubWS.vehicle = vehicle; return FF7.world.WorldScene.prototype.canEnter.call(stubWS, x, y); }
    const v = ws.vehicle; ws.vehicle = vehicle; try { return ws.canEnter(x, y); } finally { ws.vehicle = v; }
  };
  // A* on the world grid (wraps both ways); location tiles other than the goals are never stepped on
  R.worldPath = function (ws, sx, sy, goals, vehicle, o = {}) {
    const D = R.worldD(), W = D.w, H = D.h, E = R.entries();
    const goalSet = new Set(goals.map(g => mod(g[0], W) + ',' + mod(g[1], H)));
    sx = mod(sx, W); sy = mod(sy, H);
    if (goalSet.has(sx + ',' + sy)) return [];
    // (step-hook tiles kept off, but not those within 2 tiles of a goal: a place the walk is meant to reach)
    const hooks = o.throughHooks ? null : R.hookTiles();
    if (hooks) for (const k of [...hooks]) { const [hx, hy] = k.split(',').map(Number); if (goals.some(g => Math.max(Math.abs(wrapD(g[0] - hx, W)), Math.abs(wrapD(g[1] - hy, H))) <= 2)) hooks.delete(k); }
    const pass = (x, y) => { const k = x + ',' + y; if (goalSet.has(k)) return true; if (E[k] && !o.throughPlaces) return false; if (hooks && hooks.has(k)) return false; return R.worldCan(ws, vehicle, x, y); };
    const hOf = (x, y) => { let b = Infinity; for (const g of goals) { const dx = Math.abs(wrapD(g[0] - x, W)), dy = Math.abs(wrapD(g[1] - y, H)); b = Math.min(b, Math.max(dx, dy) + 0.414 * Math.min(dx, dy)); } return b; };
    const N = W * H, g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const s0 = sy * W + sx; g[s0] = 0; push(hOf(sx, sy), s0);
    let found = -1, n = 0;
    while (heap.length && n++ < (o.maxNodes || 120000)) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
      const x = i % W, y = (i / W) | 0;
      if (goalSet.has(x + ',' + y)) { found = i; break; }
      for (const [dx, dy] of DIRS8) {
        const nx = mod(x + dx, W), ny = mod(y + dy, H), j = ny * W + nx;
        if (closed[j] || !pass(nx, ny)) continue;
        if (dx && dy && (!pass(mod(x + dx, W), y) || !pass(x, mod(y + dy, H)))) continue;
        const ng = g[i] + (dx && dy ? 1.414 : 1);
        if (ng < g[j]) { g[j] = ng; came[j] = i; push(ng + hOf(nx, ny), j); }
      }
    }
    if (found < 0) return hooks && hooks.size ? R.worldPath(ws, sx, sy, goals, vehicle, Object.assign({}, o, { throughHooks: true })) : null;
    const path = [];
    for (let i = found; i !== s0 && i >= 0; i = came[i]) path.push([i % W, (i / W) | 0]);
    return path.reverse();
  };
  R.steerWorld = function (ws, tx, tz) {
    const D = R.worldD(), dx = wrapD(tx - ws.px, D.w), dz = wrapD(tz - ws.pz, D.h), d = Math.hypot(dx, dz) || 1;
    let best = null, bs = -9;
    for (const dir of DIRS8) {
      const v = worldVec(dir[0], dir[1], ws.camYaw || 0);
      const aim = (v[0] * dx + v[1] * dz) / d;
      const mx = ws.canEnter(Math.floor(ws.px + v[0] * 0.2), Math.floor(ws.pz)) ? v[0] : 0;
      const mz = ws.canEnter(Math.floor(ws.px + mx * 0.2), Math.floor(ws.pz + v[1] * 0.2)) ? v[1] : 0;
      const s = (mx * dx + mz * dz) / d + aim * 0.02;
      if (s > bs) { bs = s; best = dir; }
    }
    if (best) btnsFor(best[0], best[1]).forEach(b => R.hold(b, 1));
  };
  // walk / drive along a world path to any goal tile; returns true, 'mapchanged' (entered a place) or a reason
  // o.heal: false = no patching up after the random battles on the way (R.patchUp: under 50% HP, casters
  // under 30% MP; items kept: 3 Potions)
  R.walkWorld = function* (goals, o = {}) {
    if (!goals || !goals.length) return 'world walk: no tiles to go to';
    const D = R.worldD();
    const prevGoals = R._worldGoals;
    R._worldGoals = new Set(goals.map(g => mod(g[0], D.w) + ',' + mod(g[1], D.h)));
    try { return yield* walkWorld0(goals, o); } finally { R._worldGoals = prevGoals; }
  };
  R.worldHealWanted = function () {
    const act = FF7.sys.party.active().filter(Boolean);
    return act.some(c => c.hp < c.maxHp * 0.5) || act.some(c => R.usesMp(c) && c.mp < c.maxMp * 0.3);
  };
  const walkWorld0 = function* (goals, o) {
    const D = R.worldD();
    let path = null, i = 0, replans = 0, best = Infinity, since = 0, b0 = R.stats.battles;
    for (let guard = 0; guard < 400000; guard++) {
      if (R.stats.battles !== b0) {                   // after a battle on the way: patched up (like a player)
        b0 = R.stats.battles;
        if (o.heal !== false && R.worldScene() && R.worldHealWanted()) { yield* R.patchUp({ below: 0.5, itemBelow: 0.5, mp: 0.3, keepPotions: 3, tent: o.tent === true }); path = null; }
      }
      const ws = R.worldScene(); if (!ws) return 'mapchanged';
      const tx0 = mod(Math.floor(ws.px), D.w), ty0 = mod(Math.floor(ws.pz), D.h);
      const onGoal = goals.some(g => mod(g[0], D.w) === tx0 && mod(g[1], D.h) === ty0);
      if (onGoal && (o.anywhere || Math.hypot(wrapD(tx0 + 0.5 - ws.px, D.w), wrapD(ty0 + 0.5 - ws.pz, D.h)) < 0.2)) return true;
      if (!path || R.gap) { path = R.worldPath(ws, tx0, ty0, goals, ws.vehicle, o); i = 0; best = Infinity; since = 0; if (!path) return 'no ' + (ws.vehicle || 'foot') + ' path on the world map from ' + tx0 + ',' + ty0 + ' to ' + goals[0].join(','); if (!path.length) path = [[tx0, ty0]]; }
      for (let k = Math.min(path.length - 1, i + 6); k > i; k--) if (path[k][0] === tx0 && path[k][1] === ty0) { i = k; break; }
      let d = Math.hypot(wrapD(path[i][0] + 0.5 - ws.px, D.w), wrapD(path[i][1] + 0.5 - ws.pz, D.h));
      while (i < path.length - 1 && d < 0.3) { i++; d = Math.hypot(wrapD(path[i][0] + 0.5 - ws.px, D.w), wrapD(path[i][1] + 0.5 - ws.pz, D.h)); }
      const left = d + (path.length - 1 - i);
      if (left < best - 0.01) { best = left; since = 0; } else if (++since > 240) { path = null; if (++replans > 6) return 'stuck on the world map at ' + tx0 + ',' + ty0; yield; continue; }
      R.steerWorld(ws, path[i][0] + 0.5, path[i][1] + 0.5);
      yield;
    }
    return 'world walk: gave up';
  };
  // airship: turn toward the tile, fly forward when lined up (turning on the spot when not)
  R.fly = function* (tx, ty) {
    const D = R.worldD();
    for (let guard = 0; guard < 60000; guard++) {
      const ws = R.worldScene(); if (!ws) return 'mapchanged';
      if (ws.vehicle !== 'highwind') return 'not flying';
      const dx = wrapD(tx + 0.5 - ws.px, D.w), dz = wrapD(ty + 0.5 - ws.pz, D.h), d = Math.hypot(dx, dz);
      if (d < 0.4) return true;
      const diff = angWrap(Math.atan2(dx, dz) - ws.angle);
      if (Math.abs(diff) > 0.03) R.hold(diff > 0 ? 'left' : 'right', 1);
      if (Math.abs(diff) < 0.45) R.hold('up', 1);
      yield;
    }
    return 'flight: gave up';
  };
  const LANDABLE = 'gsdnwxpch';
  const worldTile = (x, y) => { const D = R.worldD(); return D.rows[mod(y, D.h)][mod(x, D.w)]; };
  // tiles next to a parked vehicle (or its own tile) that a player on foot can board it from
  R.boardSpots = function (ws, id, p) {
    const out = [], reach = id === 'highwind' ? 2 : 1;
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      if (Math.hypot(dx, dy) > (id === 'highwind' ? 2.1 : 1.05)) continue;
      const x = p.x + dx, y = p.y + dy; if (R.worldCan(ws, null, x, y) && !R.entries()[mod(x, R.worldD().w) + ',' + mod(y, R.worldD().h)]) out.push([x, y]);
    }
    return out;
  };
  // the tiles a vehicle can reach the location from: the location tile itself (buggy, chocobo), a
  // landing tile near it (airship), a water tile beside the shore near it (boats)
  // (boats, with `from` = the boat's tile: the shore of the location's own landmass that the boat can get
  // to, R.shoreApproach; the water tiles within 5 of it when there is none)
  R.approach = function (ws, vehicle, L, from) {
    if (!vehicle || vehicle === 'buggy' || vehicle === 'chocobo') return [[L.x, L.y]];
    if (vehicle !== 'highwind' && from) { const sh = R.shoreApproach(ws, vehicle, L, from); if (sh.length) return sh; }
    const out = [];
    for (let r = 1; r <= 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = L.x + dx, y = L.y + dy;
      if (vehicle === 'highwind') { if (LANDABLE.includes(worldTile(x, y)) && !R.entries()[mod(x, R.worldD().w) + ',' + mod(y, R.worldD().h)]) out.push([x, y]); }
      else if (R.worldCan(ws, vehicle, x, y) && DIRS8.some(([ax, ay]) => R.worldCan(ws, null, x + ax, y + ay))) out.push([x, y]);
    }
    return out;
  };
  // Boats (Tiny Bronco, submarine...): the water tiles beside the location's own landmass (the ground reached
  // on foot from it, 60 tiles at most) where stepping off lands on that landmass (WorldScene.findLand's
  // order), that the boat can reach from `from`; the ones nearest the location (on foot) first
  const LAND8 = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  R.shoreApproach = function (ws, vehicle, L, from) {
    const D = R.worldD(), W = D.w, H = D.h, E = R.entries(), idx = (x, y) => mod(x, W) + mod(y, H) * W;
    const dist = new Int32Array(W * H).fill(-1), q = [idx(L.x, L.y)];
    dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0; if (dist[i] >= 60) continue;
      for (const [dx, dy] of DIRS8) { const j = idx(x + dx, y + dy); if (dist[j] >= 0 || E[(j % W) + ',' + ((j / W) | 0)] || !R.worldCan(ws, null, x + dx, y + dy)) continue; dist[j] = dist[i] + 1; q.push(j); }
    }
    // (where findLand puts the party; only a side-by-side one, not a location, so the boat can be boarded again
    // from there: R.boardSpots)
    const landing = (x, y) => { for (let n = 0; n < LAND8.length; n++) { const [dx, dy] = LAND8[n], c = worldTile(x + dx, y + dy), k = mod(x + dx, W) + ',' + mod(y + dy, H); if (D.walk.includes(c) || E[k]) return n < 4 && !E[k] ? idx(x + dx, y + dy) : -1; } return -1; };
    const cand = new Map();
    for (const i of q) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS8) {
        const wx = mod(x + dx, W), wy = mod(y + dy, H), j = wx + wy * W;
        if (cand.has(j) || E[wx + ',' + wy] || !R.worldCan(ws, vehicle, wx, wy)) continue;
        const l = landing(wx, wy); if (l < 0 || dist[l] < 0) continue;
        cand.set(j, dist[l]);
      }
    }
    if (!cand.size) return [];
    // what the boat can get to from where it is
    const seen = new Uint8Array(W * H), bq = [idx(from[0], from[1])];
    seen[bq[0]] = 1;
    for (let h = 0; h < bq.length; h++) {
      const i = bq[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = idx(x + dx, y + dy); if (seen[j] || E[(j % W) + ',' + ((j / W) | 0)] || !R.worldCan(ws, vehicle, x + dx, y + dy)) continue; seen[j] = 1; bq.push(j); }
    }
    const ok = [...cand.entries()].filter(([j]) => seen[j]).sort((a, b) => a[1] - b[1]);
    if (!ok.length) return [];
    const best = ok[0][1];
    return ok.filter(([, d]) => d <= best + 4).slice(0, 40).map(([j]) => [j % W, (j / W) | 0]);
  };
  // which world locations the party can get to now: on foot from where it is on the world map (or where
  // it left it; start: { x, y } = where it will come out), in the vehicle it is in, or in a parked one it can
  // walk to (the Highwind: all of them). -> { all: true } | { locs: Set(ids) } | null (unknown). Cached while
  // nothing it depends on changes.
  R.worldReach = function (start) {
    const st = FF7.state, D = R.worldD(), W = D.w, H = D.h, E = R.entries();
    if (!st || !st.world) return null;
    const ws = FF7.sceneMgr.stack.find(sc => R.isWorld(sc)) || null;
    const sx = start ? mod(start.x, W) : ws ? mod(Math.floor(ws.px), W) : st.world.x, sy = start ? mod(start.y, H) : ws ? mod(Math.floor(ws.pz), H) : st.world.y;
    if (sx == null || sy == null) return null;
    const cur = start ? start.vehicle || null : ws ? ws.vehicle : st.world.vehicle, parked = st.world.vehicles || {};
    const key = [sx, sy, cur, JSON.stringify(parked), st.vars.chocobo_color].join('|');
    if (R._reach && R._reach.key === key) return R._reach.v;
    let v;
    if (cur === 'highwind' || parked.highwind) v = { all: true };
    else {
      const locs = new Set(), idx = (x, y) => mod(x, W) + mod(y, H) * W;
      const flood = (starts, vehicle) => {
        const seen = new Uint8Array(W * H), q = [];
        starts.forEach(([x, y]) => { const i = idx(x, y); if (!seen[i]) { seen[i] = 1; q.push(i); } });
        for (let h = 0; h < q.length; h++) {
          const i = q[h], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of DIRS8) {
            const nx = mod(x + dx, W), ny = mod(y + dy, H), j = nx + ny * W; if (seen[j]) continue;
            const Lc = E[nx + ',' + ny];
            if (Lc) { if (!vehicle || vehicle === 'buggy' || vehicle === 'chocobo') locs.add(Lc.id); continue; }
            if (!R.worldCan(ws, vehicle, nx, ny)) continue;
            seen[j] = 1; q.push(j);
          }
        }
        return q;
      };
      const foot = flood([[sx, sy]], null), footSet = new Set(foot);
      const boat = (id, x, y) => {
        const water = flood([[x, y]], id), lands = [];
        water.forEach(i => { const x2 = i % W, y2 = (i / W) | 0; for (const [dx, dy] of LAND8) if (R.worldCan(ws, null, x2 + dx, y2 + dy)) { lands.push([x2 + dx, y2 + dy]); break; } });
        flood(lands, null);
      };
      const ride = (id, x, y) => { if (id === 'buggy' || id === 'chocobo') flood([[x, y]], id); else boat(id, x, y); };
      if (cur) ride(cur, sx, sy);
      for (const id of Object.keys(parked)) {
        const p = parked[id]; if (!p || id === cur) continue;
        if (R.boardSpots(ws, id, p).some(([x, y]) => footSet.has(idx(x, y)))) ride(id, p.x, p.y);
      }
      v = { locs };
    }
    R._reach = { key, v };
    return v;
  };
  // Travel on the world map to a location and enter it. o: { vehicle: id | 'foot' }
  R.worldTo = function* (locId, o = {}) {
    const L = FF7.world.location(locId); if (!L) return 'unknown world location ' + locId;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (R.where() !== 'world') { const g = yield* R.gotoMap('world', o); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
      let ws = R.worldScene(); if (!ws) { yield; continue; }
      const st = FF7.state, v = ws.vehicle;
      const tx0 = Math.floor(ws.px), ty0 = Math.floor(ws.pz);
      let r;
      if (v === 'highwind') {
        const spots = R.approach(ws, 'highwind', L).sort((a, b) => Math.hypot(a[0] - L.x, a[1] - L.y) - Math.hypot(b[0] - L.x, b[1] - L.y));
        if (!spots.length) return 'nowhere to land near ' + locId;
        r = yield* R.fly(spots[0][0], spots[0][1]); if (r !== true) return r;
        yield* R.pressWorld('ok');
      } else if (v && v !== 'buggy' && v !== 'chocobo' && !(o.vehicle === v)) {
        const goals = R.approach(ws, v, L, [tx0, ty0]);
        if (!goals.length) return 'world: the ' + v + ' cannot get near ' + locId;
        r = yield* R.walkWorld(goals); if (r !== true) return r;
        yield* R.pressWorld('ok');                     // step ashore (onto the location's own landmass)
      } else if (v || o.vehicle === 'foot' || R.worldPath(ws, tx0, ty0, [[L.x, L.y]], null)) {
        r = yield* R.walkWorld([[L.x, L.y]], { anywhere: true });
        if (r === 'mapchanged') return true;
        if (r !== true) return r;
        if (R.worldScene()) {                            // on the tile but not inside (just left it): step off and back on
          const off = DIRS8.map(([dx, dy]) => [L.x + dx, L.y + dy]).filter(([x, y]) => R.worldCan(ws, ws.vehicle, x, y));
          if (off.length) { yield* R.walkWorld(off, { anywhere: true }); r = yield* R.walkWorld([[L.x, L.y]], { anywhere: true }); if (r === 'mapchanged') return true; }
          return 'world: standing on ' + locId + ' does not enter it (no link?)';
        }
        return true;
      } else {
        // on foot and no way: a parked vehicle that gets there
        const parked = Object.keys(st.world.vehicles || {}).filter(id => st.world.vehicles[id] && (!o.vehicle || o.vehicle === id));
        let pick = null;
        for (const id of ['highwind', 'buggy', 'bronco', 'submarine', 'chocobo']) {
          if (!parked.includes(id)) continue;
          const p = st.world.vehicles[id], spots = R.boardSpots(ws, id, p);
          const walk = spots.length ? R.worldPath(ws, tx0, ty0, spots, null) : null;
          if (!walk) continue;
          const ap = id === 'highwind' ? [] : R.approach(ws, id, L, [p.x, p.y]);
          const leg = id === 'highwind' ? [] : ap.length ? R.worldPath(ws, p.x, p.y, ap, id) : null;
          if (!leg) continue;
          pick = { id, spots, len: walk.length + leg.length }; break;
        }
        if (!pick) {
          // two vehicles in a row: one brings the party ashore where another one, that gets there, waits
          const hop = R.vehicleHop(ws, L, parked, tx0, ty0);
          if (!hop) return 'no way to reach ' + locId + ' on foot or with a vehicle';
          R.say('world: the ' + hop.a + ' first, then the ' + hop.b);
          r = yield* R.boardVehicle(hop.a); if (r !== true) return r;
          r = yield* R.walkWorld(hop.goals); if (r !== true) return 'world: ' + hop.a + ': ' + r;
          yield* R.pressWorld('ok');                     // off, near the other vehicle (the next round boards it)
          continue;
        }
        r = yield* R.boardVehicle(pick.id); if (r !== true) return r;
      }
      yield* R.settle(3);
      if (R.where() !== 'world') return true;
    }
    return 'world: could not get into ' + locId;
  };
  // vehicle A (walked to) takes the party to the shore / ground from which vehicle B's boarding spots
  // are walked to, and B gets to location L -> { a, b, goals: A's stops } | null
  R.vehicleHop = function (ws, L, parked, x0, y0) {
    const st = FF7.state, D = R.worldD(), W = D.w, H = D.h, E = R.entries();
    for (const b of parked) {
      const pB = st.world.vehicles[b], spotsB = R.boardSpots(ws, b, pB);
      if (!spotsB.length) continue;
      if (b !== 'highwind') { const ap = R.approach(ws, b, L, [pB.x, pB.y]); if (!ap.length || !R.worldPath(ws, pB.x, pB.y, ap, b)) continue; }
      // the ground around B, on foot
      const FB = new Uint8Array(W * H), q = [];
      spotsB.forEach(([x, y]) => { const i = mod(x, W) + mod(y, H) * W; if (!FB[i]) { FB[i] = 1; q.push(i); } });
      while (q.length) {
        const i = q.pop(), x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of DIRS8) { const nx = mod(x + dx, W), ny = mod(y + dy, H), j = nx + ny * W; if (!FB[j] && !E[nx + ',' + ny] && R.worldCan(ws, null, nx, ny)) { FB[j] = 1; q.push(j); } }
      }
      for (const a of parked) {
        if (a === b || a === 'highwind' || a === 'chocobo') continue;
        const pA = st.world.vehicles[a], spotsA = R.boardSpots(ws, a, pA);
        if (!spotsA.length || !R.worldPath(ws, x0, y0, spotsA, null)) continue;
        // A's stops: the buggy gets off on its own tile (walkable ground by B); boats beside that ground
        const goals = [];
        for (let i = 0; i < FB.length; i++) {
          if (!FB[i]) continue;
          const x = i % W, y = (i / W) | 0;
          if (a === 'buggy') { if (R.worldCan(ws, 'buggy', x, y)) goals.push([x, y]); continue; }
          for (const [dx, dy] of DIRS8) { const nx = mod(x + dx, W), ny = mod(y + dy, H); if (R.worldCan(ws, a, nx, ny) && !E[nx + ',' + ny]) goals.push([nx, ny]); }
        }
        const near = goals.sort((p, q2) => Math.hypot(wrapD(p[0] - pB.x, W), wrapD(p[1] - pB.y, H)) - Math.hypot(wrapD(q2[0] - pB.x, W), wrapD(q2[1] - pB.y, H))).slice(0, 60);
        if (near.length && R.worldPath(ws, pA.x, pA.y, near, a)) return { a, b, goals: near };
      }
    }
    return null;
  };
  R.pressWorld = function* (b) { for (let g = 0; g < 4 && !R.tap(b); g++) yield; yield; yield* R.settle(3); };
  R.boardVehicle = function* (id) {
    const ws = R.worldScene(); if (!ws) return 'board: not on the world map';
    if (ws.vehicle === id) return true;
    const p = FF7.state.world.vehicles[id]; if (!p) return 'board: no ' + id + ' parked';
    const spots = R.boardSpots(ws, id, p);
    if (!spots.length) return 'board: no tile beside the ' + id + ' at ' + p.x + ',' + p.y + ' to board it from';
    const r = yield* R.walkWorld(spots); if (r !== true) return 'board ' + id + ': ' + r;
    yield* R.pressWorld('ok');
    const w2 = R.worldScene();
    return w2 && w2.vehicle === id ? true : 'board: could not get on the ' + id;
  };

  // ================================================================== checkpoints and saves
  R.checkpoint = function (label) {
    const st = FF7.state;
    const data = { v: 1, label, pc: R.pc, chapter: R.chapter, chapterTitle: R.chapterTitle, objective: R.objective, battleOpts: R.battleOpts, frames: R.frames, stats: JSON.parse(JSON.stringify(R.stats)), state: JSON.parse(JSON.stringify(st)) };
    R.ckpts[label] = data; R.lastCkpt = label;
    const P = R.store();
    if (P && P.saveCkpt) { try { P.saveCkpt(label, data); } catch (e) { R.note('checkpoint ' + label + ' not written: ' + e.message); } }
    R.say('checkpoint ' + label + ' (' + (R.where() || '?') + ')');
    return data;
  };
  R.loadCkpt = function (label) { const P = R.store(); return R.ckpts[label] || (P && P.loadCkpt ? P.loadCkpt(label) : null); };
  // where checkpoints are kept besides memory: a Demo keeps them in memory only; a developer run in the
  // browser ('dev') in localStorage; the harness sets R.persist (files); opts.persist overrides
  R.localPersist = {
    saveCkpt(label, data) { localStorage.setItem('ff7_runner_ckpt_' + label, JSON.stringify(data)); },
    loadCkpt(label) { try { const s = localStorage.getItem('ff7_runner_ckpt_' + label); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  };
  R.store = function () {
    const o = R.opts || {};
    if (o.persist !== undefined) return o.persist;
    return o.mode === 'demo' ? null : o.mode === 'dev' ? R.localPersist : (R.persist || null);
  };
  // Put the game back to a checkpoint and carry on after its ['ckpt', label] step.
  R.restore = function (label, o = {}) {
    const data = isObj(label) ? label : R.loadCkpt(label);
    if (!data) return false;
    const S = FF7.sceneMgr;
    S.layer = S.layer.filter(w => w._keep);        // dialogs and scene coroutines go (the Demo HUD stays)
    S.transition = null; S.fader.alpha = 0; S.fader.target = 0; S.shake.frames = 0; S.flash.alpha = 0;
    FF7._gameOverPending = false;
    FF7.loadState(JSON.parse(JSON.stringify(data.state)));
    if (o.retry) { R.retries[data.label] = (R.retries[data.label] || 0) + 1; R.stats.restores++; }
    R.ckpts[data.label] = data; R.lastCkpt = data.label;
    R.chapter = data.chapter; R.chapterTitle = data.chapterTitle || ''; R.objective = data.objective || '';
    R.battleOpts = data.battleOpts || {};
    const i = R.plan.findIndex(s => norm(s)[0] === 'ckpt' && norm(s)[1] === data.label);
    R.pc = i >= 0 ? i + 1 : 0;                         // a checkpoint from another plan: this plan from the top
    // (read from a file, the battle options have lost their functions - a turn hook, fleeIf: the chapter's own
    // `battle` step before the checkpoint gives them back when they came from it)
    if (i >= 0 && data.battleOpts) {
      for (let k = i - 1; k >= 0; k--) {
        const s = norm(R.plan[k]); if (s[0] === 'chapter') break;
        if (s[0] !== 'battle') continue;
        const so = isObj(s[1]) ? s[1] : null, keys = so ? Object.keys(so) : [], pick = (o) => JSON.stringify(keys.map(key => [key, o[key]]));
        if (so && pick(so) === pick(data.battleOpts)) R.battleOpts = Object.assign({}, data.battleOpts, so);   // (the fields a battle added kept)
        break;
      }
    }
    R.curBattle = null; R.curMinigame = null; R._goSeen = false; R.holds = {}; R.side = null; R.menuOwn = false;
    R.applyConfig();
    R.gen = R.main();
    R.say('restored checkpoint ' + data.label + ' -> step ' + R.pc);
    return true;
  };
  function summaryOf(st) {
    const lead = st.chars[st.party.find(p => p) || 'cloud'];
    return { leader: lead ? lead.id : 'cloud', leaderName: lead ? lead.name : 'Cloud', level: lead ? lead.level : 1, party: st.party.slice(), location: st.locName || '', time: st.time, gil: st.gil, disc: st.disc, date: Date.now() };
  }
  // A game save: the DEMO file in a Demo (or with opts.demoSave); a file in the harness's folder
  // (R.persist.saveGame); a developer run in the browser writes nothing (opts.demoSave writes the DEMO file).
  R.saveGame = function (why, viaMenu) {
    if (!FF7.state) return false;
    R._lastSaveFrame = R.frames;
    // the file keeps the player's settings, not the runner's (Auto battle, battle speed)
    const st = JSON.parse(JSON.stringify(FF7.state));
    if (R.cfgSaved) Object.assign(st.config, R.cfgSaved);
    if (R.opts.mode === 'demo' && R.demo && R.demo.saved) st.config = Object.assign(FF7.defaultConfig(), R.demo.saved);
    if (R.opts.mode === 'demo' || R.opts.demoSave) {
      // into a real slot (the Demo's own file: FF7.save.demoSlot), so the player can continue it any time
      const slot = FF7.save.writeDemoSlot ? FF7.save.writeDemoSlot(st) : -1;
      if (slot >= 0) { R.stats.saves++; R.say('saved File ' + (slot + 1) + ' (Demo; ' + why + ')'); if (R.opts.mode === 'demo' && !viaMenu && FF7.ui.notice) FF7.ui.notice('Saved to File ' + String(slot + 1).padStart(2, '0'), 60); return true; }
      return false;
    }
    const P = R.store();
    if (P && P.saveGame) { try { P.saveGame(why, { summary: summaryOf(st), state: st }); R.stats.saves++; R.say('saved (' + why + ')'); return true; } catch (e) { R.note('save not written: ' + e.message); return false; } }
    R.say('save (' + why + '): not written in a developer run');
    return true;
  };
  // the Save screen's DEMO row (js/ui/save_menu.js) while the runner plays
  R.saveFromMenu = function (why) { R._menuSaves = (R._menuSaves || 0) + 1; return R.saveGame(R._saveWhy || why || 'Save screen', true) !== false; };
  // a save the way a player makes one: Menu > Save > the DEMO row (a direct write when that fails)
  R.visibleSave = function* (why) {
    R._saveWhy = why;
    const n0 = R._menuSaves || 0;
    const ok = yield* R.menus.run('save (' + why + ')', R.menus.save(), () => (R._menuSaves || 0) > n0);
    R._saveWhy = null;
    if (!ok) R.saveGame(why);
    return true;
  };
  // Side tasks, run on free frames before the plan's step: the Config trip (Run: Always) when the menu
  // is first usable, and saving at a save point that is passed (R.autoSave)
  R.sideTasks = function () {
    if (R.side) return;
    // after a battle that left the party in a bad way (someone down, or under 35% HP), patched up before
    // anything else, as a player would (R.patchUp: under half HP, casters under 20% MP, 2 Potions kept).
    // Off with start({ autoHeal: false }) or ['battle', { autoHeal: false }]
    if (R._healDue) {
      R._healDue = false;
      if (R.opts.autoHeal !== false && (R.battleOpts || {}).autoHeal !== false && R.afterBattleHealWanted()) { R.side = R.afterBattleHeal(); return; }
    }
    if (R.limits && R.limits.due()) { R.side = R.limits.trip(); return; }   // the limit levels (js/runner/limits.js)
    if (!R.menuVisible() || !R.menus) return;
    const c = FF7.state && FF7.state.config;
    if (c && !c.alwaysRun && !R._cfgTrip && R.menus.canOpen()) { R._cfgTrip = true; R.side = R.configTrip(); }
  };
  R.afterBattleHealWanted = function () {
    const act = FF7.sys.party.active().filter(Boolean);
    return act.some(c => c.hp <= 0 || c.hp < c.maxHp * 0.35);
  };
  R.afterBattleHeal = function* () {
    R.say('after the battle: patching up');
    yield* R.patchUp({ below: 0.5, itemBelow: 0.5, mp: 0.2, keepPotions: 2, tent: false });
    return true;
  };
  R.configTrip = function* () {
    const r = yield* R.menus.run('Config > Run: Always', R.menus.configRun(true), () => !!FF7.state.config.alwaysRun);
    if (!r) FF7.state.config.alwaysRun = true;
    R.say('config: Run: Always');
    return true;
  };
  // passing a save point saves (once per visit of the map)
  R.autoSave = function (fs) {
    if (!FF7.saveNearby) return;
    const k = fs.map.id + ':' + fs.loadGen;
    if (R._savedAt === k) return;
    R._savedAt = k;
    if (R.menuVisible() && R.menus && !R.side && FF7.state.menuEnabled !== false) { R.side = R.visibleSave('save point on ' + fs.map.id); return; }
    R.saveGame('save point on ' + fs.map.id);
  };

  // A synthetic start for a chapter (R.starts[ch]; tools/run_runner.js --start ch): a new game set to the
  // profile, then the chapter's first map. Fields: map, entry (or world: loc | { x, y, vehicle }),
  // members, away [ids] (exist, not in the group), party, levels { id: n }, names, flags [...], vars, items { id: n }, keyItems, gil,
  // equip { id: { weapon, armor, accessory } }, materia { id: [weapon slots..., armor slots...] } (ids or
  // { id, ap }), stock [...], phs, menu, disc
  // a start profile's materia: 'id' or { id, ap, eskills: [...] } (an Enemy Skill materia's own skills)
  const mkMateria = (m) => {
    const x = FF7.sys.materia.make(typeof m === 'string' ? m : m.id, typeof m === 'string' ? 0 : m.ap || 0);
    if (x && isObj(m) && Array.isArray(m.eskills)) x.eskills = m.eskills.slice();
    return x;
  };
  R.applyStart = function (p) {
    const st = FF7.newGame({ skipIntro: true });
    const P = FF7.sys.party;
    (p.members || p.party || ['cloud']).forEach(id => P.join(id, { toParty: false }));
    // away: characters who exist (their levels, gear, materia) but aren't in the group now (they left, or
    // haven't joined yet in this start)
    (p.away || []).forEach(id => { if (!st.chars[id]) st.chars[id] = FF7.makeChar(id); });
    P.set((p.party || p.members || ['cloud']).slice(0, 3));
    for (const id in (p.levels || {})) { const c = st.chars[id]; if (c) FF7.sys.stats.autoLevel(c, p.levels[id]); }
    for (const id in (p.names || {})) if (st.chars[id]) st.chars[id].name = p.names[id];
    (p.flags || []).forEach(f => { st.flags[f] = true; });
    Object.assign(st.vars, p.vars || {});
    st.items = []; for (const id in (p.items || {})) FF7.sys.inv.add(id, p.items[id]);
    (p.keyItems || []).forEach(id => FF7.sys.inv.addKey(id));
    st.gil = p.gil || 0;
    for (const id in (p.equip || {})) { const c = st.chars[id]; if (!c) continue; for (const slot in p.equip[id]) { c[slot] = p.equip[id][slot]; } FF7.sys.stats.fitMateriaSlots(c); }
    for (const id in (p.materia || {})) {
      const c = st.chars[id]; if (!c) continue;
      FF7.sys.materia.unequipAll(c); st.materia = [];
      const list = p.materia[id], slots = c.weaponMateria.concat(c.armorMateria).map(() => null);
      list.forEach((m, i) => { if (i < slots.length && m) slots[i] = mkMateria(m); });
      c.weaponMateria = slots.slice(0, c.weaponMateria.length); c.armorMateria = slots.slice(c.weaponMateria.length);
    }
    (p.stock || []).forEach(m => FF7.sys.materia.toStock(mkMateria(m)));
    st.phsEnabled = !!p.phs; st.menuEnabled = p.menu !== false; st.disc = p.disc || 1;
    for (const id in (p.limitLevels || {})) { const c = st.chars[id]; if (c) c.limitLevel = p.limitLevels[id]; }
    if (p.limitPolicy === false) { if (R.active) R.limitPolicy = false; else R._pendingLimitPolicy = false; }
    if (p.vehicles) st.world.vehicles = JSON.parse(JSON.stringify(p.vehicles));   // parked on the world map: { buggy: { x, y }, ... }
    Object.values(st.chars).forEach(c => FF7.sys.stats.recalc(c));
    P.healAll();
    if (p.world) FF7.world.enter(p.world);
    else FF7.field.start(p.map, p.entry);
    if (p.after) p.after(st);                         // (the profile's own setup: Kupomon's MogBoy)
    return st;
  };

  // ================================================================== battle tactician
  R.installTactician = function () {
    const AI = FF7.battle.ai;
    if (!AI || AI.autoBattle === R.autoBattleHook) return;
    R.origAutoBattle = AI.autoBattle;
    AI.autoBattle = R.autoBattleHook;
  };
  R.uninstallTactician = function () {
    const AI = FF7.battle.ai;
    if (AI && AI.autoBattle === R.autoBattleHook && R.origAutoBattle) AI.autoBattle = R.origAutoBattle;
  };
  R.autoBattleHook = function (battle, p) { return R.active ? R.tactic(battle, p) : R.origAutoBattle(battle, p); };
  // E.Skills the party already knows (every Enemy Skill materia it owns)
  R.knownEskills = function () {
    const st = FF7.state, out = new Set();
    const add = (m) => { if (m && m.id === 'enemy_skill') (m.eskills || []).forEach(e => out.add(e)); };
    st.materia.forEach(add); Object.values(st.chars).forEach(c => FF7.sys.materia.equippedList(c).forEach(add));
    return out;
  };
  // Each equipped Enemy Skill materia learns on its own (FF7: every E.Skill materia on the character hit
  // learns the skill), so in a battle a skill counts as known once every E.Skill materia on the fighting
  // members has it; { learnEach: false } in the battle options: once any materia the party owns has it
  R.eskillKnown = function (battle) {
    const o = R.battleOpts || {};
    if (o.learnEach === false || !battle) return R.knownEskills();
    // { learnEach: 'master' }: the master copy (R.eskillMaster) decides, when a fighting member carries it
    const mm = o.learnEach === 'master' && R.eskillMasterIn(battle);
    if (mm) return { has: (id) => (mm.eskills || []).includes(id) };
    const mats = []; battle.party.forEach(pm => { if (pm.alive && pm.eskillMateria) pm.eskillMateria.forEach(m => mats.push(m)); });
    if (!mats.length) return R.knownEskills();
    return { has: (id) => mats.every(m => (m.eskills || []).includes(id)) };
  };
  // FF7's 100% goal is one Enemy Skill materia with all 24 skills: the master copy is the one that knows the
  // most (the active party's first, then the reserve's, then the list's on a tie). The plans' setups
  // (autoMateria's `eskill`, loadout) hand it to the first member they name
  R.eskillMaster = function () {
    const st = FF7.state; let best = null;
    const see = (m) => { if (m && m.id === 'enemy_skill' && (!best || (m.eskills || []).length > (best.eskills || []).length)) best = m; };
    const ids = st.party.filter(Boolean).concat(st.members.filter(id => !st.party.includes(id)));
    ids.forEach(id => { const c = st.chars[id]; if (c && !FF7.isGuest(id)) FF7.sys.materia.equippedList(c).forEach(see); });
    st.materia.forEach(see);
    return best;
  };
  // does the master copy know all of these skills? (the learning ops' goal)
  R.masterKnows = function (ids) { const m = R.eskillMaster(); return !!m && [].concat(ids).every(e => (m.eskills || []).includes(e)); };
  // the master copy when a fighting member of this battle carries it (else null)
  R.eskillMasterIn = function (battle) {
    const m = R.eskillMaster();
    return m && battle && battle.party.some(pm => pm.alive && !pm.hidden && (pm.eskillMateria || []).includes(m)) ? m : null;
  };
  // the fighting members with an E.Skill materia that lacks this skill (who an enemy should hit with it); with
  // { learnEach: 'master' } the master's holder
  R.eskillNeeders = (battle, id) => {
    const mm = (R.battleOpts || {}).learnEach === 'master' && R.eskillMasterIn(battle);
    if (mm) return (mm.eskills || []).includes(id) ? [] : battle.party.filter(pm => pm.alive && pm.targetable !== false && (pm.eskillMateria || []).includes(mm));
    return battle.party.filter(pm => pm.alive && pm.targetable !== false && (pm.eskillMateria || []).some(m => !(m.eskills || []).includes(id)));
  };
  // the skills each E.Skill materia knows: [{ where: charId | 'stock', eskills: [...] }]
  R.eskillsByMateria = function () {
    const st = FF7.state, out = [];
    Object.values(st.chars).forEach(c => FF7.sys.materia.equippedList(c).forEach(m => { if (m && m.id === 'enemy_skill') out.push({ where: c.id, eskills: (m.eskills || []).slice() }); }));
    st.materia.forEach(m => { if (m && m.id === 'enemy_skill') out.push({ where: 'stock', eskills: (m.eskills || []).slice() }); });
    return out;
  };
  // MP's price for the Auto AI in this battle (HP of damage per MP point): 1 against a boss, 1.5 when the
  // enemy is dangerous (5+ levels above the party, someone down or under 40% HP), 2 with a rest point near
  // (a save point or an inn on this map or the next; tents on the world map), 4 with MP to spare (>80%),
  // else 6 (a long walk: kept for healing). Battle option mp: 'free' (1) | 'save' (8) | a number.
  R.mpFactor = function (battle) {
    const o = R.battleOpts || {};
    if (typeof o.mp === 'number') return o.mp;
    if (o.mp === 'free') return 1;
    if (o.mp === 'save') return 8;
    const foes = battle.enemies.filter(e => e.targetable), party = battle.party.filter(x => x.alive && !x.hidden);
    if (foes.some(e => e.boss)) return 1;
    const avg = party.reduce((a, x) => a + (x.level || 1), 0) / Math.max(1, party.length);
    if (foes.some(e => (e.level || 1) >= avg + 5) || battle.party.some(x => !x.alive && !x.hidden) || party.some(x => x.hp < x.maxHp * 0.4)) return 1.5;
    // (Sneak Attack and Magic Counter pairs spend MP by themselves: MP is a little dearer then)
    const auto = party.some(x => { const ab = x.char && FF7.sys.materia.abilities(x.char); return !!ab && ((ab.sneak || []).length > 0 || (ab.magicCounters || []).length > 0); }) ? 1.25 : 1;
    if (R.restNear()) return 2 * auto;
    const mp = party.reduce((a, x) => a + x.mp, 0), max = party.reduce((a, x) => a + x.maxMp, 0);
    if (max > 0 && mp > max * 0.8) return 4 * auto;
    return 6 * auto;
  };
  // a rest point near: a save point or an inn on this map or one exit away; tents in the bag on the world map
  const restCache = new Map();
  R.mapHasRest = function (id) {
    if (restCache.has(id)) return restCache.get(id);
    const def = FF7.maps[id]; let v = false;
    if (def) {
      v = !!def.save;
      if (!v) try { const P = F.parseMap(def); for (let y = 0; y < P.h && !v; y++) for (let x = 0; x < P.w; x++) if (P.at(x, y).save) { v = true; break; } } catch (e) { v = false; }
      const src = (n) => n ? Object.keys(n).map(k => typeof n[k] === 'function' ? String(n[k]) : '').join(' ') : '';
      if (!v) v = [].concat(def.npcs || [], def.triggers || [], def.objects || []).some(n => /\binn\(/.test(src(n)));
    }
    restCache.set(id, v);
    return v;
  };
  R.restNear = function () {
    const id = R.where(); if (!id) return false;
    if (id === 'world') return FF7.sys.inv.count('tent') > 0;
    if (R.mapHasRest(id)) return true;
    const def = FF7.maps[id];
    return !!def && (def.exits || []).some(e => e.to && e.to !== 'world' && R.mapHasRest(e.to));
  };
  // enemies the party should leave alone this turn: to learn their E.Skill ({ learn }), to keep them
  // ({ spare: [ids] }), or to take them last ({ last: [ids] })
  // learn: true | [eskillIds] | { skill: id | [ids], enemyHpBelow: 0.65, hold: true, physical, turns } -> { want, below, hold, physical, turns }
  R.learnSpec = function (o) {
    const l = o && o.learn; if (!l) return null;
    if (l === true) return { want: null };
    if (Array.isArray(l) || typeof l === 'string') return { want: [].concat(l) };
    if (isObj(l)) return { want: l.skill || l.skills ? [].concat(l.skill || l.skills) : null, below: l.enemyHpBelow, hold: !!l.hold, physical: l.enemyHpBelow != null && l.physical !== false, turns: l.turns };
    return null;
  };
  // the enemies whose Enemy Skill the fighting E.Skill materia still lack (and that the plan wants learned)
  R.learnTargets = function (battle) {
    const o = R.battleOpts || {}, ls = R.learnSpec(o);
    if (!ls || (battle.turnCount || 0) >= (o.learnTurns || ls.turns || 60)) return [];
    if (!battle.party.some(pm => pm.alive && pm.eskillMateria && pm.eskillMateria.length)) return [];
    // (the fight comes first: no sparing while two members are down or the party is under 35% of its HP)
    const pm = battle.party.filter(x => !x.hidden), hp = pm.reduce((t, x) => t + Math.max(0, x.hp), 0), max = pm.reduce((t, x) => t + x.maxHp, 0);
    if (pm.filter(x => !x.alive).length >= 2 || (max && hp < max * 0.35)) return [];
    const known = R.eskillKnown(battle), manip = !!R.manipOpts(battle);
    // (an attack the enemy never uses by itself (manipOnly) only counts when it can be Manipulated; its final
    // attack (ai.onDeath: Dragon Zombie's Pandora's Box) is learned by killing it: no reason to spare it)
    return battle.enemies.filter(e => {
      if (!e.targetable) return false;
      const death = e.def0 && e.def0.ai && typeof e.def0.ai.onDeath === 'string' ? e.def0.ai.onDeath : null;
      return Object.entries(e.attacks || {}).some(([k, a]) => k !== death && a.eskill && !known.has(a.eskill) && (!ls.want || ls.want.includes(a.eskill)) && (!a.manipOnly || manip));
    });
  };
  // the damage the party's queued actions will do to e (their estimate; R.actMaxDamage without the spread)
  R.queuedDamage = function (battle, e) {
    return battle.queue.concat(battle.current ? [battle.current] : []).filter(q => q && q.actor && q.actor.isParty && q.side === 'enemy' && (q.all || (q.targets || []).includes(e)))
      .reduce((t, q) => { let d = 0; try { d = R.actMaxDamage(q.actor, q, e) / 1.25; } catch (err) { d = 0; } return t + (isFinite(d) ? d : e.maxHp * 0.25); }, 0);
  };
  // Limit training (['learnLimits'], the Limit Break Mechanics guide's way): the foes are left standing to hit
  // the learners (lt.learners: the ones with a limit still to learn by use) - the learners wait (no Defend: the
  // gauge fills with the HP lost), the others Defend, whoever is low is healed - and a learner whose gauge is full
  // uses the limit that teaches. Normal fighting when someone is down, two are under 30% HP, or after lt.turns (150)
  R.limitTrainTurn = function (battle, p, lt) {
    const party = battle.party.filter(x => !x.hidden);
    if (party.some(x => !x.alive)) return null;
    const needOf = (x) => x.char && (lt.learners || []).includes(x.id) ? R.limits.need(x.char, lt.upTo || 3) : null;
    // (lt.uses === false: kills only - the uses come from the gauge as it fills by itself, the policy's levels)
    const learners = lt.uses === false ? [] : party.filter(x => { const n = needOf(x); return n && n.mode === 'uses'; });
    if (!battle.enemies.some(e => e.targetable)) return null;
    if (!learners.length) {
      // kills (FF7: the first limit of a level comes with the character's own killing blows): the learners fight,
      // the others heal the hurt, and otherwise chip the foes down with plain attacks that can't finish one (a
      // critical hit's margin and the damage already queued counted, R.actMaxDamage), so the killing blows are
      // the learners' and a strong foe doesn't outlast them; else Defend
      const killers = party.filter(x => { if (lt.uses === false) return x.char && (lt.learners || []).includes(x.id) && R.limits.killsNeed(x.char, lt.upTo || 3) > 0; const n = needOf(x); return n && n.mode === 'kills'; });
      if (!killers.length || killers.includes(p) || party.filter(x => x.hp < x.maxHp * 0.3).length >= 2) return null;
      const lowK = party.filter(x => x.hp < x.maxHp * 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const hk = lowK && R.healAct(p, lowK); if (hk) return hk;
      const chip = !p.has('confusion') && !p.has('berserk') && battle.enemies.filter(e => e.targetable && !(e.has && e.has('reflect'))).filter(e => {
        let d = Infinity; try { d = R.actMaxDamage(p, { type: 'attack' }, e) * 1.6; } catch (err) { d = Infinity; }
        return isFinite(d) && d + R.queuedDamage(battle, e) < e.hp;
      }).sort((a, b) => b.hp - a.hp)[0];
      return chip ? { actor: p, type: 'attack', targets: [chip], side: 'enemy' } : { actor: p, type: 'defend' };
    }
    if (learners.includes(p) && p.limitGauge >= 255) { const lk = FF7.battle.ai.pickLimit(battle, p); if (lk) { p.limitGauge = 0; return lk.act; } return null; }
    if ((battle.turnCount || 0) > (lt.turns || 150) || party.filter(x => x.hp < x.maxHp * 0.3).length >= 2) return null;
    const q = battle.queue.concat(battle.current ? [battle.current] : []);
    const low = party.filter(x => x.hp < x.maxHp * (learners.includes(x) ? 0.4 : 0.5) && !q.some(a => a && a.actor && a.actor.isParty && a.side === 'ally' && (a.targets || []).includes(x)))
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (low) { const h = R.healAct(p, low); if (h) return h; }
    if (learners.includes(p)) {
      // the learner stays busy while the enemies keep hitting her: a plain attack that can't finish anyone (a
      // critical's margin and the damage already queued counted); only when every hit might kill, she waits
      const chip = !p.has('confusion') && !p.has('berserk') && battle.enemies.filter(e => e.targetable && !(e.has && e.has('reflect'))).filter(e => {
        let d = Infinity; try { d = R.actMaxDamage(p, { type: 'attack' }, e) * 1.6; } catch (err) { d = Infinity; }
        return isFinite(d) && d + R.queuedDamage(battle, e) < e.hp;
      }).sort((x, y) => y.hp - x.hp)[0];
      return chip ? { actor: p, type: 'attack', targets: [chip], side: 'enemy' } : { actor: p, type: 'wait', frames: 30 };
    }
    return { actor: p, type: 'defend' };
  };
  // ['battle', { healAt }]: a heal from p for the free members under that fraction of their HP (the heals already
  // on their way counted): Cure-All (a Cure spell linked with All) for two or more, else R.healAct on the lowest
  R.healAbove = function (battle, p, frac) {
    if (!p.alive || p.has('imprisoned')) return null;
    const alive = battle.party.filter(x => x.alive && !x.hidden && !x.has('imprisoned'));
    const q = battle.queue.concat(battle.current ? [battle.current] : []);
    const SPH = FF7.data.spells, heals = (a) => a.type === 'item' || (a.type === 'magic' && SPH[a.id] && SPH[a.id].kind === 'heal') || (a.type === 'eskill' && a.id === 'white_wind');
    const coming = (x) => q.some(a => a && a.actor && a.actor.isParty && a.side === 'ally' && heals(a) && (a.all || (a.targets || []).includes(x)));   // (a heal on its way: Big Guard isn't one)
    const low = alive.filter(x => x.hp < x.maxHp * frac && !coming(x)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    if (!low.length) return null;
    const SP = FF7.data.spells;
    // (two or more under 40%: a Megalixir for everyone, when there is one)
    if (low.filter(x => x.hp < x.maxHp * 0.4).length >= 2 && FF7.sys.inv.count('megalixir') > 0) return { actor: p, type: 'item', item: 'megalixir', targets: alive, side: 'ally', all: true };
    if (low.length >= 2 && !p.has('silence')) {
      const sp = (p.abilities && p.abilities.spells || []).filter(x => /^cure/.test(x.id) && SP[x.id] && p.mp >= SP[x.id].mp)
        .map(x => ({ x, all: (x.supports || []).find(y => y.id === 'all') })).filter(y => y.all && (y.all.level || 1) > ((p.allUses || {})[y.x.id] || 0))
        .sort((a, b) => (SP[b.x.id].power || 0) - (SP[a.x.id].power || 0))[0];
      if (sp) { p.allUses = p.allUses || {}; p.allUses[sp.x.id] = (p.allUses[sp.x.id] || 0) + 1; return { actor: p, type: 'magic', id: sp.x.id, targets: alive, side: 'ally', useAll: true, all: true }; }
    }
    return R.healAct(p, low[0]);
  };
  // a Cure (the strongest affordable) or a Hi-Potion / X-Potion / Potion from p on t
  R.healAct = function (p, t) {
    const SP = FF7.data.spells;
    const cure = p.has('silence') ? null : (p.abilities && p.abilities.spells || []).map(x => x.id).filter(id => /^cure/.test(id) && SP[id] && p.mp >= SP[id].mp).sort((a, b) => (SP[b].power || 0) - (SP[a].power || 0))[0];
    if (cure) return { actor: p, type: 'magic', id: cure, targets: [t], side: 'ally' };
    const pot = ['hi_potion', 'x_potion', 'potion'].find(id => FF7.sys.inv.count(id) > 0);
    return pot ? { actor: p, type: 'item', item: pot, targets: [t], side: 'ally' } : null;
  };
  // physical only: o.physicalOnly [enemy ids], and learn targets still above their enemyHpBelow
  R.physOnlySet = function (battle) {
    const o = R.battleOpts || {}, out = new Set(), ls = R.learnSpec(o);
    if (o.physicalOnly) { const ids = [].concat(o.physicalOnly); battle.enemies.forEach(e => { if (e.targetable && (o.physicalOnly === true || ids.includes(e.id))) out.add(e); }); }
    if (ls && ls.physical) R.learnTargets(battle).forEach(e => out.add(e));
    return out;
  };
  // holding fire: the most hurt member under 70% (nobody already on it) gets a Cure (the strongest affordable)
  // or a Hi-Potion / X-Potion / Potion
  R.holdHeal = function (battle, p) {
    const SP = FF7.data.spells, q = battle.queue.concat(battle.current ? [battle.current] : []);
    const low = battle.party.filter(x => x.alive && !x.hidden && x.hp < x.maxHp * 0.7 && !q.some(a => a && a.actor && a.actor.isParty && a.side === 'ally' && (a.targets || []).includes(x)))
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!low) return null;
    const cure = p.has('silence') ? null : (p.abilities && p.abilities.spells || []).map(x => x.id).filter(id => /^cure/.test(id) && SP[id] && p.mp >= SP[id].mp).sort((a, b) => (SP[b].power || 0) - (SP[a].power || 0))[0];
    if (cure) return { actor: p, type: 'magic', id: cure, targets: [low], side: 'ally' };
    const pot = ['hi_potion', 'x_potion', 'potion'].find(id => FF7.sys.inv.count(id) > 0);
    return pot ? { actor: p, type: 'item', item: pot, targets: [low], side: 'ally' } : null;
  };
  R.spared = function (battle) {
    const o = R.battleOpts || {}, out = new Set();
    const foes = battle.enemies.filter(e => e.targetable);
    // (with enemyHpBelow: hit down to that share of its HP first, the queued actions counted, then held)
    const ls = R.learnSpec(o);
    R.learnTargets(battle).forEach(e => { if (ls.below != null && e.hp - R.queuedDamage(battle, e) > e.maxHp * ls.below) return; out.add(e); });
    // Manipulate: the enemies to manipulate and the one under control are left alone until the skill is learned
    const mo = R.manipOpts(battle);
    if (mo && (battle.turnCount || 0) < (mo.turns || 80)) { const tg = R.manipTargets(battle, mo); tg.forEach(e => out.add(e)); if (tg.length) foes.forEach(e => { if (e.has('manipulate') && e.manipulator && e.manipulator.isParty) out.add(e); }); }
    if (o.spare && (battle.turnCount || 0) < (o.spareTurns || 60)) foes.forEach(e => { if ([].concat(o.spare).includes(e.id)) out.add(e); });
    // { steal: [...], stealHold: turns }: an enemy carrying a wanted steal is left standing until it is stolen (for
    // that many turns, while someone with Steal / Mug can act and the party isn't in trouble): a boss's one-of-a-kind
    // steal (the Warrior Bangle, the Circlet) isn't lost to a quick win
    if (o.steal && o.stealHold && (battle.turnCount || 0) < o.stealHold) {
      const pm = battle.party.filter(x => !x.hidden), hp = pm.reduce((t, x) => t + Math.max(0, x.hp), 0), max = pm.reduce((t, x) => t + x.maxHp, 0);
      const thief = pm.some(x => x.alive && ((x.abilities && x.abilities.commands) || []).some(c => c === 'steal' || c === 'mug'));
      if (thief && pm.filter(x => !x.alive).length < 2 && !(max && hp < max * 0.4)) {
        const wanted = o.steal === true ? null : [].concat(o.steal);
        foes.forEach(e => { if (e.steals && e.steals.length && !e.stolen && (!wanted || wanted.includes(e.id) || e.steals.some(s => wanted.includes(s.item)))) out.add(e); });
      }
    }
    if (o.last) { const lastSet = foes.filter(e => [].concat(o.last).includes(e.id)); if (lastSet.length < foes.length) lastSet.forEach(e => out.add(e)); }
    return out;
  };
  // ---- Manipulate: ['battle', { manipulate: { enemy, use, targetAlly, always, turns } | true }]; learn
  // with a Manipulate materia equipped does it by itself for skills the enemy never casts on its own
  const low = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  R.manipOpts = function (battle) {
    const o = R.battleOpts || {}, m = o.manipulate || o.manip;
    if (m) return m === true ? {} : isObj(m) ? m : { enemy: m };
    const ls = R.learnSpec(o);
    if (ls && battle && battle.party.some(pm => pm.alive && pm.abilities && (pm.abilities.commands || []).includes('manipulate'))) return { learn: ls.want };
    return null;
  };
  // is attack k of enemy e the one the plan wants cast (and still worth it)?
  R.manipWanted = function (e, k, mo, known) {
    const a = e.attacks[k]; if (!a) return false;
    if (mo.use) return (k === mo.use || low(a.name) === low(mo.use)) && (mo.always || !a.eskill || !known.has(a.eskill));
    return !!a.eskill && !known.has(a.eskill) && (!mo.learn || mo.learn.includes(a.eskill));
  };
  R.manipTargets = function (battle, mo) {
    const known = R.eskillKnown(battle), ids = mo.enemy ? [].concat(mo.enemy) : null;
    const canLearn = mo.use || battle.party.some(pm => pm.alive && pm.eskillMateria && pm.eskillMateria.length);
    if (!canLearn) return [];
    return battle.enemies.filter(e => e.targetable && !e.boss && !e.immuneTo('manipulate') && (!ids || ids.includes(e.id)) && FF7.battle.manipList(e).some(k => R.manipWanted(e, k, mo, known)));
  };
  // the manipulated enemy's turn: the wanted attack on the party member who should learn it
  R.manipTurn = function (battle, e) {
    const mo = R.manipOpts(battle) || {}, known = R.eskillKnown(battle);
    // (not twice: an earlier order of the same attack may still be waiting in the queue or under way)
    const pending = (x) => battle.queue.some(q => q.actor === e && q.id === x) || (battle.current && battle.current.actor === e && battle.current.id === x);
    const k = FF7.battle.manipList(e).find(x => R.manipWanted(e, x, mo, known) && !pending(x));
    const a = k && e.attacks[k];
    if (a && a.mp && e.maxMp > 0 && e.mp < a.mp) { if (!e._rMpNoted) { e._rMpNoted = true; R.note('manipulate: ' + e.name + ' lacks the MP for ' + a.name); } }
    else if (a) {
      const t = a.target || 'enemy';                    // ('self' is FF7's "1 Al": under Manipulate, one of the party)
      if (t === 'self' && !a.eskill) return { actor: e, type: 'enemy', id: k, manip: true, targets: [e], side: 'ally' };
      const party = battle.party.filter(x => x.targetable);
      const holders = party.filter(x => x.eskillMateria && x.eskillMateria.length);
      const who = party.find(x => x.id === mo.targetAlly) || (a.eskill && R.eskillNeeders(battle, a.eskill)[0]) || holders[0] || party[0];   // one whose materia still lacks it
      const all = /^all[A-Z]/.test(t);
      R.say('manipulate: ' + e.name + ' uses ' + a.name + ' on ' + (all ? 'the party' : who.name));
      return { actor: e, type: 'enemy', id: k, manip: true, all, targets: all ? party : [who], side: 'enemy' };
    }
    return FF7.battle.ai.manipAuto(battle, e);
  };
  // Morph (FF7: it morphs only with the killing blow, a hit of a quarter of an attack). The wanted enemies
  // ({ morph: true | [enemy or item ids] }), while a Morph user can act (for morphTurns, 120): an action that
  // might finish one (R.actMaxDamage: the attack / spell / limit / summon's damage, its spread included) is not
  // made by the others (they pick again without it, or Defend), and the Morph user Morphs it instead. Not while
  // the party is in trouble (two members down, under 40% HP): the fight comes first
  // an enemy whose death attack is a once-per-game Enemy Skill the master materia still lacks, with the MP to cast it
  // (the Dragon Zombie's Pandora's Box: the Enemy-Skill FAQ - its final attack, once per game): it must die quickly (its
  // MP spent, there is no cast) and only while the master's holder can be hit (a miss then is for good)
  R.lastWordSkill = function (e) {
    const d = e && e.def0 && e.def0.ai && e.def0.ai.onDeath, a = typeof d === 'string' && e.attacks && e.attacks[d];
    if (!a || !a.eskill || !a.oncePerGame || R.masterKnows(a.eskill) || FF7.state.flags['once_' + e.id + '_' + d]) return null;
    return !a.mp || e.maxMp <= 0 || e.mp >= a.mp ? a.eskill : null;
  };
  // those enemies while the master's holder, in this fight, is down or can't be hit: not to be finished yet
  R.lastWordGuard = function (battle) {
    const out = new Set(), mm = R.eskillMaster();
    const holder = mm && battle.party.find(x => (x.eskillMateria || []).includes(mm));
    if (!holder || (holder.alive && !holder.hidden && holder.targetable !== false && !['petrify', 'imprisoned'].some(s => holder.has(s)))) return out;
    battle.enemies.forEach(e => { if (e.targetable && R.lastWordSkill(e)) out.add(e); });
    return out;
  };
  R.morphTargets = function (battle) {
    const o = R.battleOpts || {}, out = new Set();
    if (!o.morph || (battle.turnCount || 0) >= (o.morphTurns || 120)) return out;
    const bad = ['stop', 'sleep', 'paralysis', 'petrify', 'confusion', 'berserk', 'frog', 'imprisoned'];
    // (not while the party is in trouble: two members down, or under 40% of its HP - the fight comes first)
    const pm = battle.party.filter(x => !x.hidden), hp = pm.reduce((t, x) => t + Math.max(0, x.hp), 0), max = pm.reduce((t, x) => t + x.maxHp, 0);
    if (pm.filter(x => !x.alive).length >= 2 || (max && hp < max * 0.4)) return out;
    // (a Morph user who is down counts while the party can bring it back: it is revived first)
    const canRevive = FF7.sys.inv.count('phoenix_down') > 0 || battle.party.some(x => x.alive && (x.abilities && x.abilities.spells || []).some(sp => /^life/.test(sp.id)));
    if (!battle.party.some(x => !x.hidden && (x.abilities && x.abilities.commands || []).includes('morph') && (x.alive ? !bad.some(st => x.has(st)) : canRevive))) return out;
    const want = o.morph === true ? null : [].concat(o.morph);
    // (not an enemy that must fall quickly for its death attack: R.lastWordSkill - Morph's quarter blows drain its MP)
    battle.enemies.forEach(e => { if (e.targetable && e.morph && (!want || want.includes(e.id) || want.includes(e.morph)) && !R.lastWordSkill(e)) out.add(e); });
    return out;
  };
  R.actMaxDamage = function (p, act, e) {
    const C = FF7.battle.calc, D = FF7.data;
    const ph = () => C.physBase(p.stat('atk'), p.level) * (512 - Math.min(511, e.stat('def'))) / 512;
    const mg = (power) => (power || 8) * (512 - Math.min(511, e.stat('mdf'))) * C.magBase(p.stat('mat'), p.level) / (16 * 512);
    switch (act.type) {
      case 'attack': case 'mug': return ph() * 1.25;                // (the damage's spread; a critical hit is a risk taken)
      case 'magic': { const d = D.spells[act.id] || {}; return d.kind === 'damage' ? mg(d.power) * 1.25 : 0; }
      case 'eskill': { const d = D.eskills[act.id] || {}; return d.kind === 'damage' ? mg(d.power) * 1.25 : d.kind === 'gravity' ? e.hp * (d.pct || 50) / 100 : d.kind === 'status' ? 0 : Infinity; }
      case 'summon': { const d = D.summons[act.id] || {}; return d.kind === 'damage' ? mg(d.power) * (d.hits || 1) * 1.25 : 0; }
      case 'limit': { const L = D.limits[act.id] || {}; return L.kind === 'phys' ? ph() * (L.power || 16) / 16 * (L.hits || 1) * 1.25 : L.kind === 'heal' || L.kind === 'buff' ? 0 : Infinity; }
      case 'morph': return ph() * 1.25 / 4;                         // (a quarter of an attack)
      case 'steal': case 'sense': case 'manipulate': case 'defend': case 'wait': return 0;
      // a battle item on the foes (the Auto AI's AI.itemDamage at the top of its spread; Stardust's four hits all
      // counted on e); Kiss of Death / Vagyrisk Claw can end it; other status items do no damage
      case 'item': {
        const f = (D.items[act.item] || {}).effect || {};
        if (act.side !== 'enemy') return 0;
        if (f.damage) { const v = FF7.battle.ai.itemDamage(p, act.item, e, true); return v > 0 ? v * (f.damage.hits || 1) : 0; }
        return (f.enemyStatus || []).some(s => s === 'death' || s === 'petrify') ? Infinity : 0;
      }
      default: return act.side === 'ally' ? 0 : Infinity;
    }
  };
  // one party member's turn: the plan's tactics first, then the Auto-battle AI
  R.tactic = function (battle, p) {
    const orig = R.origAutoBattle || FF7.battle.ai.autoBattle;
    const o = R.battleOpts || {};
    try {
      if (!p.isParty) return R.manipTurn(battle, p);                  // a manipulated enemy's turn
      battle._auto = battle._auto || { buffs: {} };
      battle._auto.mpFactor = R.mpFactor(battle);                      // how dear MP is in this fight (the Auto AI's price)
      // the Auto AI's battle items on the foes (AI.itemOffence): off with { items: false } and in fights the WEAPON
      // tactic runs ({ weapon }); { keepItems: [ids] | { id: n } }: never thrown (or n kept) besides AI.KEEP_ITEMS
      battle._auto.itemPolicy = { off: o.items === false || !!o.weapon, keep: o.keepItems || null };
      if (R.wantFlee(battle)) {
        // running (the ATB still fills): a Smoke Bomb once the escape keeps failing; else only a revive or a heal
        // the AI wants, or Defend
        const q = battle.queue.concat(battle.current ? [battle.current] : []);
        if (battle._rSmoke && FF7.sys.inv.count('smoke_bomb') > 0 && !q.some(x => x && x.item === 'smoke_bomb')) return { actor: p, type: 'item', item: 'smoke_bomb', targets: [p], side: 'ally' };
        const a0 = orig(battle, p);
        return a0 && a0.side === 'ally' && a0.type !== 'defend' && a0.type !== 'limit' ? a0 : { actor: p, type: 'defend' };
      }
      // the plan's own turn logic (['battle', { turn: fn(battle, p, R) -> action | null }]): first say
      if (typeof o.turn === 'function') { let a1 = null; try { a1 = o.turn(battle, p, R); } catch (e) { R.note('battle turn hook: ' + errText(e)); } if (a1) return a1; }
      if (o.limitTrain) { const a2 = R.limitTrainTurn(battle, p, o.limitTrain); if (a2) return a2; }
      // { healAt: frac }: a boss whose blow on everyone takes more than half of someone's HP (Carry Armor's Lapis Laser):
      // whoever can heal keeps the free members above that fraction - Cure-All for two or more, else the lowest
      if (o.healAt) { const h = R.healAbove(battle, p, o.healAt); if (h) return h; }
      // fury: [ids] | true (['learnLimits']): a Hyper on themselves first (FF7's Fury: the limit gauge fills twice as fast)
      if (o.fury && (o.fury === true || [].concat(o.fury).includes(p.id)) && !(o.limitTrain && p.char && (R.limits.need(p.char, o.limitTrain.upTo || 3) || {}).mode !== 'uses') && !p.has('fury') && !p.has('sadness') && FF7.sys.inv.count('hyper') > 0
        && !battle.queue.concat(battle.current ? [battle.current] : []).some(q => q && q.item === 'hyper' && (q.targets || []).includes(p))) return { actor: p, type: 'item', item: 'hyper', targets: [p], side: 'ally' };
      const cmds = (p.abilities && p.abilities.commands) || [];
      const foes = battle.enemies.filter(e => e.targetable);
      const spare = R.spared(battle), ls = R.learnSpec(o);
      if (o.steal && (cmds.includes('steal') || cmds.includes('mug'))) {
        const wanted = o.steal === true ? null : [].concat(o.steal);
        const t = foes.find(e => e.steals && e.steals.length && !e.stolen && (!wanted || wanted.includes(e.id) || e.steals.some(s => wanted.includes(s.item))));
        if (t) { R.stats.stealTries = (R.stats.stealTries || 0) + 1; return { actor: p, type: cmds.includes('steal') ? 'steal' : 'mug', targets: [t], side: 'enemy' }; }
      }
      if (o.sense && cmds.includes('sense')) { const t = foes.find(e => !R.sensed[e.id]); if (t) { R.sensed[t.id] = true; return { actor: p, type: 'sense', targets: [t], side: 'enemy' }; } }
      if (o.morph && cmds.includes('morph')) {
        const C = FF7.battle.calc;
        const t = foes.find(e => e.morph && !spare.has(e) && e.hp <= Math.max(1, C.physBase(p.stat('atk'), p.level) * (512 - Math.min(511, e.stat('def'))) / 512 / 4));
        if (t) return { actor: p, type: 'morph', targets: [t], side: 'enemy' };
      }
      // the enemy under control lacks the MP for the skill: an Ether for it (Enemy-Skill FAQ, Zemzelett)
      const mAll = R.manipOpts(battle), ctl = mAll && foes.find(e => e.has('manipulate') && e.manipulator && e.manipulator.isParty);
      if (ctl && !battle.queue.concat(battle.current || []).some(q => q.type === 'item' && (q.targets || []).includes(ctl))) {
        const kk = FF7.battle.manipList(ctl).find(x => R.manipWanted(ctl, x, mAll, R.eskillKnown(battle))), at = kk && ctl.attacks[kk];
        const it = at && at.mp && ctl.maxMp > 0 && ctl.mp < at.mp && ['ether', 'turbo_ether', 'elixir'].find(i => FF7.sys.inv.count(i) > 0);
        if (it) { R.say('manipulate: ' + U.itemName(it) + ' for ' + ctl.name + ' (MP for ' + at.name + ')'); return { actor: p, type: 'item', item: it, targets: [ctl], side: 'enemy' }; }
      }
      const mo = cmds.includes('manipulate') && mAll;
      if (mo && !foes.some(e => e.has('manipulate') && e.manipulator && e.manipulator.alive)) {
        const t = R.manipTargets(battle, mo)[0];
        if (t) { R.stats.manips = (R.stats.manips || 0) + 1; return { actor: p, type: 'manipulate', targets: [t], side: 'enemy' }; }
      }
      if (o.limit === 'use' && p.limitGauge >= 255 && p.char && p.char.limitsKnown && p.char.limitsKnown.length && !p.transformed) {
        // (the one that fits: a heal when the party is hurt, else the strongest attack... - AI.pickLimit)
        const pool = foes.filter(e => !spare.has(e));
        const lk = FF7.battle.ai.pickLimit(battle, p, { foes: pool, any: true });
        const sparedHit = lk && lk.act && lk.act.all && lk.act.side === 'enemy' && [...spare].some(e => e.targetable);   // (an All limit would hit the spared one)
        if (lk && lk.act && !sparedHit && (pool.length || lk.act.side === 'ally')) { p.limitGauge = 0; return lk.act; }
      }
      let gauge = null;
      if (o.limit === 'hold' && p.limitGauge >= 255) { gauge = p.limitGauge; p.limitGauge = 0; }
      let view = battle;
      if (spare.size) {
        // (nor one the queued commands already finish: FF7 turns a blow at a fallen foe onto another one, and
        // that could be the spared one - a Manipulated Zemzelett killed before its White Wind)
        const keep = battle.enemies.filter(e => !spare.has(e) && !(e.targetable && R.queuedDamage(battle, e) >= e.hp));
        battle._auto = battle._auto || { buffs: {} };
        view = Object.create(battle); view.enemies = keep;
        if ([...spare].some(e => e.targetable)) view.noAll = true;   // (no All spells / summons: the engine aims them at every foe)
        if (!keep.some(e => e.targetable)) { const act0 = orig(view, p); if (gauge != null) p.limitGauge = gauge; return act0 && act0.side === 'ally' && act0.type !== 'defend' ? act0 : ((ls && ls.hold && R.holdHeal(battle, p)) || { actor: p, type: 'defend' }); }
      }
      // (the AI's bookkeeping, put back when its choice is replaced: the limit gauge, All and summon uses)
      const g0 = p.limitGauge, all0 = Object.assign({}, p.allUses), sum0 = Object.assign({}, p.summonUses);
      const undo = () => { p.limitGauge = g0; p.allUses = Object.assign(p.allUses || {}, all0); Object.keys(p.allUses).forEach(k => { if (!(k in all0)) delete p.allUses[k]; }); p.summonUses = Object.assign(p.summonUses || {}, sum0); Object.keys(p.summonUses).forEach(k => { if (!(k in sum0)) delete p.summonUses[k]; }); };
      let act = orig(view, p);
      const mt = R.morphTargets(battle);
      for (let tries = 0; mt.size && act && act.side === 'enemy' && tries < 4; tries++) {
        // (a critical hit's margin, and the damage already on its way from the queued commands, counted)
        const risky = (act.targets || []).filter(e => mt.has(e) && R.actMaxDamage(p, act, e) * (act.type === 'attack' || act.type === 'mug' ? 1.6 : 1) + R.queuedDamage(battle, e) >= e.hp);
        if (!risky.length) break;
        undo();
        if (cmds.includes('morph')) { const t = risky.sort((a, b) => a.hp - b.hp)[0]; act = { actor: p, type: 'morph', targets: [t], side: 'enemy' }; break; }
        const v2 = Object.create(battle); v2.enemies = view.enemies.filter(e => !risky.includes(e)); v2.noAll = view.noAll; view = v2;   // the others: something else
        if (!v2.enemies.some(e => e.targetable)) { const a0 = orig(v2, p); act = a0 && a0.side === 'ally' ? a0 : { actor: p, type: 'defend' }; break; }
        act = orig(v2, p);
      }
      // the enemies R.lastWordGuard holds back (the master's holder down): no action that might finish one (the others
      // choose again without them, or Defend) - the Auto AI's revive comes first anyway
      const gd = R.lastWordGuard(battle);
      for (let tries = 0; gd.size && act && act.side === 'enemy' && tries < 4; tries++) {
        const risky = (act.all ? battle.enemies.filter(e => e.targetable) : act.targets || []).filter(e => gd.has(e) && R.actMaxDamage(p, act, e) * (act.type === 'attack' || act.type === 'mug' ? 1.6 : 1.2) + R.queuedDamage(battle, e) >= e.hp);
        if (!risky.length) break;
        undo();
        const v2 = Object.create(battle); v2.enemies = view.enemies.filter(e => !risky.includes(e)); v2.noAll = view.noAll; view = v2;
        if (!v2.enemies.some(e => e.targetable)) { const a0 = orig(v2, p); act = a0 && a0.side === 'ally' ? a0 : { actor: p, type: 'defend' }; break; }
        act = orig(v2, p);
      }
      // physical only (['battle', { physicalOnly: [enemy ids] }], and learn targets above their HP threshold): an
      // action on them that isn't a plain attack becomes one (on a held one: the party is kept healthy instead)
      const po = R.physOnlySet(battle);
      if (po.size && act && act.side === 'enemy' && !['attack', 'steal', 'mug', 'sense', 'morph', 'manipulate'].includes(act.type)) {
        const hit = (act.all ? battle.enemies.filter(e => e.targetable) : act.targets || []).filter(e => po.has(e));
        if (hit.length) { undo(); const t = hit.find(e => !spare.has(e)); act = t ? { actor: p, type: 'attack', targets: [t], side: 'enemy' } : (R.holdHeal(battle, p) || { actor: p, type: 'defend' }); }
      }
      if (ls && ls.hold && act && act.type === 'defend' && spare.size) act = R.holdHeal(battle, p) || act;
      if (gauge != null) p.limitGauge = gauge;
      return act;
    } catch (e) {
      R.note('tactician: ' + e.message);
      return orig(battle, p);
    }
  };

  // ================================================================== ops
  const O = R.ops;
  // ['new']: NEW GAME on the title screen (puts the title up first when there is none)
  O.new = function* () {
    let T = R.top();
    if (!(T && T.isTitle)) { FF7.sceneMgr.set(new FF7.scenes.Title()); T = R.top(); }
    while (T.t < 52 && R.top() === T) yield;
    const want = T.items.indexOf('NEW GAME');
    for (let g = 0; g < 60 && T.idx !== want && R.top() === T; g++) { R.tap(T.idx > want ? 'up' : 'down'); yield; yield; }
    if (!R.fast) for (let i = 0; i < 40; i++) yield;
    for (let g = 0; g < 4 && !R.tap('ok'); g++) yield;
    for (let g = 0; g < 900; g++) { yield; if (R.where()) return true; }
    return 'NEW GAME did not start';
  };
  // ['start', profile | chapterId]: a synthetic start (see R.applyStart)
  O.start = function* (p) {
    const prof = typeof p === 'string' ? R.starts[p] : p;
    if (!prof) return 'no start profile ' + p;
    R.applyStart(prof); R.applyConfig();
    yield* R.settle(3);
    return true;
  };
  O.chapter = function* (id, title) { R.chapter = id; R.chapterTitle = title || id; R.objective = title || ''; R.say('== ' + (title || id)); return true; };
  O.obj = function* (text) { R.objective = text; R.say('objective: ' + text); return true; };
  O.note = function* (text) { R.say('note: ' + text); return true; };
  O.todo = function* (text) { R.endStatus = 'incomplete'; R.say('the route ends here: ' + (text || 'not written yet')); return 'STOP'; };
  O.ckpt = function* (label) {
    yield* R.settle(4);
    R.checkpoint(label);
    // the milestone save: through the menu where a player can save (a save point, the world map); the
    // harness also keeps a file per milestone; a Demo only saves where a player could
    const canSave = R.menuVisible() && R.menus && ((R.field() && FF7.saveNearby) || R.worldScene()) && R.menus.canOpen();
    const justSaved = R._lastSaveFrame != null && R.frames - R._lastSaveFrame < 300;
    if (justSaved) R.say('milestone ' + label + ': saved just now');
    else if (canSave) yield* R.visibleSave('milestone ' + label);
    else if (R.opts.mode !== 'demo' || !R.menuVisible()) R.saveGame('milestone ' + label);
    else R.say('milestone ' + label + ': no save point here'); 
    if (R.opts.to === label) { R.endStatus = 'reached ' + label; R.pc++; return 'STOP'; }
    return true;
  };
  // ['save']: at a save point of this map (walks to it first); the DEMO file / the harness's folder
  O.save = function* (o = {}) {
    const fs = R.field();
    if (fs && o.walk !== false) {
      const sp = fs.objects.filter(x => x.kind === 'save');
      if (sp.length) {
        const pts = []; sp.forEach(s => DIRS8.forEach(([dx, dy]) => pts.push([s.at[0] + dx, s.at[1] + dy])));
        pts.push(...sp.map(s => s.at));
        const ok = pts.filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y));
        const r = yield* R.walkField(ok, { anywhere: true });
        if (r !== true && r !== 'mapchanged') R.note('save: could not reach the save point (' + r + ')');
        for (let g = 0; g < 3; g++) yield;
      }
    }
    const f = R.field(), k = f ? f.map.id + ':' + f.loadGen : null;
    if (k && R._savedAt === k && !R.side) return true;   // saved on the way in (passing the save point)
    if (R.side) { while (R.side) yield; return true; }       // (that save is going on right now)
    R._savedAt = k;
    if (R.menuVisible() && R.menus) yield* R.visibleSave('save point on ' + (R.where() || '?'));
    else R.saveGame('save point on ' + (R.where() || '?'));
    return true;
  };
  // walk up to this map's save point (where a Tent may be pitched); false when the map has none or it can't be reached
  R.toSavePoint = function* () {
    const fs = R.field(); if (!fs) return false;
    const sp = fs.objects.filter(x => x.kind === 'save' && (!x.gp || x.paid)); if (!sp.length) return false;
    if (FF7.saveNearby) return true;
    const pts = []; sp.forEach(s => DIRS8.forEach(([dx, dy]) => pts.push([s.at[0] + dx, s.at[1] + dy])));
    pts.push(...sp.map(s => s.at));
    const r = yield* R.walkField(pts.filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y)), { anywhere: true });
    for (let g = 0; g < 3; g++) yield;
    return (r === true || r === 'mapchanged') && R.field() === fs && !!FF7.saveNearby;
  };
  // ['expect', cond, { soft }]: a guard; a soft one only notes a miss (and does not count for resuming)
  O.expect = function* (c, o) {
    yield* R.settle(2);
    if (R.cond(c)) return true;
    const why = 'expected ' + R.stepText([c]) + ' (map ' + R.where() + ')';
    if ((o && o.soft) || (isObj(c) && c.soft)) { R.note(why); return true; }
    return why;
  };
  O.expectMap = function* (id) {
    const f0 = R.frames;
    while (R.where() !== id && R.frames - f0 < 2400) yield;
    yield* R.settle(3);
    return R.where() === id ? true : 'expected to be on ' + id + ', on ' + R.where();
  };
  O.expectParty = function* (ids) { return yield* O.expect({ party: ids }); };
  O.try = function* (inner) {
    const s = norm(inner);
    if (R.isDone(s)) return true;
    const r = yield* O[s[0]].apply(R, s.slice(1));
    if (r !== true && r !== undefined) R.note('try ' + R.stepText(s) + ': ' + r);
    return r === 'STOP' ? r : true;
  };
  O.wait = function* (n) { const f0 = R.frames; while (R.frames - f0 < (n || 1)) yield; return true; };
  O.press = function* (b, n) { if (n) R.hold(b, n); else while (!R.tap(b)) yield; yield; yield* R.settle(2); return true; };
  O.js = function* (fn) { const r = fn(R.api(), R); if (r && typeof r.next === 'function') return yield* r; return r === undefined || r === true ? true : r; };
  // answers for the next questions, in order: an index, part of the answer's text, or fn(choices) -> index
  O.choose = function* (...a) { a.filter(x => !isObj(x)).forEach(x => R.choices.push({ a: x, pc: null })); return true; };
  // ['dateTarget', id]: whom the FF7 date-point answers favour from here on ('aeris' | 'tifa' | 'yuffie' | 'barret'; R.datePick)
  O.dateTarget = function* (id) {
    if (!['aeris', 'tifa', 'yuffie', 'barret'].includes(id)) return 'dateTarget: unknown character "' + id + '"';
    R.dateTarget = id; R.say('date target: ' + id); return true;
  };
  O.name = function* (id, name) { R.names.push({ id, name }); return true; };
  // ['battle', { steal, morph, sense, learn, learnTurns, spare, spareTurns, last, flee, limit: 'hold'|'use', once }]
  // (with morph set - unless morphSafe: false - or noCounters: true, the counter materia (Counter Attack, Magic
  // Counter, Counter) come off the members without the Morph command, on the Materia screen: a counter-attack
  // takes the killing blow a Morph needs; they go back on with the next tactics that don't ask for that)
  O.battle = function* (o) {
    const next = isObj(o) ? Object.assign({}, o) : {};
    const off = !!(next.noCounters || (next.morph && next.morphSafe !== false));
    if (!off && R._counterStash && R._counterStash.length) yield* R.countersBack();
    R.battleOpts = next;
    R.say('battle tactics: ' + JSON.stringify(R.battleOpts));
    if (off) yield* R.countersOff(!next.noCounters);
    return true;
  };
  R.COUNTERS = ['counter_attack', 'magic_counter', 'counter'];
  R.countersOff = function* (morphOnly) {
    const st = FF7.state, M = FF7.sys.materia, MT = R.mat;
    if (!MT) return true;
    R._counterStash = R._counterStash || [];
    for (const id of st.party.filter(Boolean)) {
      const c = st.chars[id]; if (!c) continue;
      if (morphOnly && M.abilities(c).commands.includes('morph')) continue;
      for (const key of ['weaponMateria', 'armorMateria']) for (let i = 0; i < c[key].length; i++) {
        const m = c[key][i]; if (!m || !R.COUNTERS.includes(m.id)) continue;
        yield* MT.take(c, key, i);
        if (!c[key][i]) R._counterStash.push({ ch: id, key, i, m });
      }
    }
    if (R.menus) yield* R.menus.finish();
    return true;
  };
  R.countersBack = function* () {
    const st = FF7.state, MT = R.mat, stash = R._counterStash || [];
    R._counterStash = [];
    for (const e of stash) {
      const c = st.chars[e.ch];
      if (c && !c[e.key][e.i] && st.materia.includes(e.m)) yield* MT.put(c, e.key, e.i, e.m);
      else R.note('counters: ' + e.m.id + ' could not go back on ' + e.ch);
    }
    if (R.menus) yield* R.menus.finish();
    return true;
  };
  // ['minigame', id, { win, mustWin, tries }]: how to play the next minigame the story starts
  O.minigame = function* (id, o = {}) { R.mgWant = Object.assign({ id }, o); return true; };

  O.goto = function* (map, o = {}) { const r = yield* R.gotoMap(map, o); return r === 'mapchanged' ? (R.where() === map ? true : 'ended on ' + R.where()) : r; };
  // (the step's { done } is checked on the way too: the walk stops as soon as it holds, e.g. a trigger's
  // scene that moves the party back would otherwise send it walking into the trigger again and again)
  O.walk = function* (x, y, o = {}) {
    const fs = R.field(); if (!fs) return 'walk: not on a field map';
    const ex = R.exitAt(fs, x, y);
    const until = o.done !== undefined ? () => R.cond(o.done) : null;
    const r = yield* R.walkField([[x, y]], Object.assign({ near: 0.12 }, o, ex ? { exitOk: ex } : {}, until ? { until } : {}));
    if (r === 'until') { yield* R.settle(3); return true; }
    if (r === 'mapchanged') { R.say('walk: the map changed on the way (' + R.where() + ')'); return true; }
    if (r === true) yield* R.settle(3);
    return r;
  };
  // ['exit', to | index | [x, y]]: step into one of this map's exits
  O.exit = function* (t, o = {}) {
    const fs = R.field(); if (!fs) return 'exit: not on a field map';
    const ex = typeof t === 'number' ? fs.map.exits[t] : Array.isArray(t) ? R.exitAt(fs, t[0], t[1]) : (fs.map.exits || []).find(e => e.to === t || (!e.to && e.run && R.scriptTargets(e.run).has(t)));
    if (!ex) return 'exit: no exit ' + JSON.stringify(t) + ' on ' + fs.map.id;
    const r = yield* R.takeExit(ex, o);
    return r === 'mapchanged' || r === 'moved' ? true : r;
  };
  O.talk = function* (id, o = {}) {
    const times = o.times || 1;
    if (o.map && R.where() !== o.map) { const g = yield* R.gotoMap(o.map); if (g !== true && g !== 'mapchanged') return 'talk: ' + g; if (R.where() !== o.map) return 'talk: not on ' + o.map + ' (' + R.where() + ')'; yield* R.settle(3); }
    for (let n = 0; n < times; n++) {
      const fs = R.field(); if (!fs) return 'talk: not on a field map';
      const a = fs.actors[id];
      // (a shopkeeper with no script of their own: the counter in front of them - a talk-trigger or object next to them)
      if (a && a.visible && a.def && !(a.def.talk || a.def.onTalk)) {
        const nextTo = (at) => at && a.tx >= at[0] - 1 && a.tx <= at[0] + (at[2] || 1) && a.ty >= at[1] - 1 && a.ty <= at[1] + (at[3] || 1);
        const tr = (fs.map.triggers || []).find(t => t.on === 'talk' && nextTo(t.at) && !(t.if && !safe(() => t.if(fs.api))));
        const ob = !tr && fs.objects.find(q => q.kind === 'object' && q.talk && nextTo(q.at));
        const spot = tr ? tr.at : ob ? ob.at : null;
        if (spot) { const r = yield* O.use(spot[0], spot[1], o); if (r !== true) return r; continue; }
      }
      if (!a || !a.visible || !a.def || !(a.def.talk || a.def.onTalk)) return 'talk: ' + id + ' is not here to talk to (' + fs.map.id + ')';
      // the NPC, or a counter object / talk-trigger in front of it that runs the same script (shops)
      const talkFn = a.def.talk || a.def.onTalk;
      // (when nothing reaches the NPC itself but a talk-trigger / object right in front of it, a counter
      // whose script is a wrapper of its own, that counter is used: the Kalm Inn's keeper)
      const near = (at) => Math.max(Math.abs(at[0] - a.tx), Math.abs(at[1] - a.ty)) <= 1 || (at[2] && a.tx >= at[0] - 1 && a.tx <= at[0] + at[2] && Math.abs(at[1] - a.ty) <= 1);
      const reach = R.standSpots(fs, (sel) => sel.kind === 'npc' && sel.actor === a, a.tx, a.ty, 3).some(sp => R.fieldPath(fs, [[sp.x, sp.y]], { throughNpcs: true }));
      const match = (sel) => { const f = R.field(); if (!f) return false; if (sel.kind === 'npc') return sel.actor === f.actors[id]; return (sel.kind === 'object' && (sel.o.talk === talkFn || (!reach && near(sel.o.at)))) || (sel.kind === 'trigger' && (sel.tr.run === talkFn || (!reach && near(sel.tr.at)))); };
      const r = yield* R.interact('talk to ' + id, match, f => { const b = f.actors[id]; return b && b.visible ? [b.tx, b.ty] : null; }, o);
      if (r !== true) return r;
      yield* R.settle(4);
    }
    return true;
  };
  // ['use', x, y]: examine the object / talk-trigger on that tile
  O.use = function* (x, y, o = {}) {
    if (o.map && R.where() !== o.map) { const g = yield* R.gotoMap(o.map); if (g !== true && g !== 'mapchanged') return 'use: ' + g; if (R.where() !== o.map) return 'use: not on ' + o.map + ' (' + R.where() + ')'; yield* R.settle(3); }   // (o.map: there first, as talk)
    const fs = R.field(); if (!fs) return 'use: not on a field map';
    const obj = fs.objects.find(q => q.at[0] === x && q.at[1] === y && (q.kind !== 'object' || q.talk));
    const tr = (fs.map.triggers || []).find(t => t.on === 'talk' && fs.inRect(t.at, x, y));
    if (!obj && !tr) return 'use: nothing to use at ' + x + ',' + y + ' on ' + fs.map.id;
    const match = (sel) => (obj && sel.o === obj) || (!obj && tr && sel.tr === tr);
    const r = yield* R.interact('use ' + x + ',' + y, match, () => [x, y], o);
    if (r === true) yield* R.settle(4);
    return r;
  };
  O.item = function* (id) {
    if (FF7.state.flags['got_' + id]) return true;
    const fs = R.field(); if (!fs) return 'item: not on a field map';
    const ob = fs.objects.find(x => x.id === id && (x.kind === 'item' || x.kind === 'chest'));
    if (!ob) return 'item ' + id + ' is not on ' + fs.map.id + ' (' + ((R.findPickup(id) || {}).map || 'no map has it') + ')';
    const r = yield* R.interact(ob.kind + ' ' + id, sel => sel.o === ob, () => ob.at, { check: () => !!FF7.state.flags['got_' + id] });
    if (r !== true) return r;
    yield* R.settle(3);
    return FF7.state.flags['got_' + id] ? true : 'item ' + id + ' was not picked up';
  };
  O.chest = O.item;
  // ['items']: every pick-up and unopened chest left on this map, nearest first
  O.items = function* () {
    const skip = new Set();
    for (let n = 0; n < 80; n++) {
      const fs = R.field(); if (!fs) return 'items: not on a field map';
      const pl = fs.player;
      const left = fs.objects.filter(o => (o.kind === 'item' || (o.kind === 'chest' && !o.open)) && !skip.has(o))
        .sort((a, b) => Math.hypot(a.at[0] - pl.tx, a.at[1] - pl.ty) - Math.hypot(b.at[0] - pl.tx, b.at[1] - pl.ty));
      if (!left.length) return true;
      const ob = left[0];
      const r = yield* R.interact(ob.kind + ' ' + (ob.id || ob.item || ob.materia || ob.gil), sel => sel.o === ob, () => ob.at, { check: () => !R.field() || !R.field().objects.includes(ob) || ob.open });
      if (r === 'mapchanged') return 'items: the map changed';
      if (r !== true) { R.note('items: skipped ' + (ob.id || ob.item) + ' (' + r + ')'); skip.add(ob); continue; }
      yield* R.settle(3);
      if (R.field() && R.field().objects.includes(ob) && !(ob.kind === 'chest' && ob.open)) skip.add(ob);
    }
    return true;
  };

  // ---- menus (applied through the game's systems, as the menu screens do)
  // Menu ops work the party menu like a player (js/runner/menus.js): open it, pick the command and the
  // character, the slot and the item / materia, confirm, back out. When a screen can't be worked (the
  // menu is disabled on this map, a reserve member the menu doesn't list...) the change goes through the
  // game's systems instead, exactly what the screen would have done, and a note says so.
  const inParty = (ch) => FF7.state.party.includes(ch);
  const matName = (id) => (FF7.data.materia[id] || {}).name || id;
  const shown = () => R.menuVisible() && R.menus;
  // the systems' side of each screen action (the same calls the screens make)
  R.apply = {
    equip(c, slot, id) { FF7.sys.stats.equip(c, slot, id); },
    // Materia screen: a listed materia into a slot; the slot's own one takes its place in the list
    put(c, key, k, m) { const S = FF7.state.materia, i = S.indexOf(m); if (i < 0) return false; const arr = c[key], old = arr[k]; S.splice(i, 1); arr[k] = m; if (old) S.splice(i, 0, old); FF7.sys.stats.recalc(c); return true; },
    take(c, key, k) { const arr = c[key]; if (!arr[k]) return true; FF7.sys.materia.toStock(arr[k], true); arr[k] = null; FF7.sys.stats.recalc(c); return true; },
    swap(a, b) { return FF7.ui.exchangeMateria(a, b); },
  };
  O.equip = function* (ch, slot, id, o = {}) {
    const st = FF7.state, c = st.chars[ch];
    if (!c) return 'equip: ' + ch + ' is not in the group';
    if (c[slot] === id) return true;
    const f = id ? U.findItem(id) : null;
    if (id && (!f || f.kind !== slot)) return 'equip: ' + id + ' is not a ' + slot;
    if (id && f.def.char && f.def.char !== ch) return 'equip: ' + id + ' is not for ' + ch;
    if (id && FF7.ui.canEquip && !FF7.ui.canEquip(c, slot, id)) return 'equip: ' + c.name + ' cannot wear ' + U.itemName(id);
    // worn by someone else: take it off them first, as a player would (an accessory comes off; armour is
    // swapped for the best other armour in the bag), so plans needn't know who wears what at a chapter's start
    if (id && !FF7.sys.inv.has(id) && (slot === 'accessory' || slot === 'armor')) {
      const other = st.members.map(m => st.chars[m]).find(x => x && x.id !== ch && x[slot] === id);
      if (other) {
        let repl = null;
        if (slot === 'armor') {
          const can = (x) => FF7.ui.canEquip ? FF7.ui.canEquip(other, 'armor', x) : true;   // who may wear it (Minerva Band: women only...)
          const bag = st.items.map(e => e.id).filter(x => { const g = U.findItem(x); return g && g.kind === 'armor' && !(g.def.char && g.def.char !== other.id) && can(x); });
          repl = bag.sort((p, q) => R.gear.score(other, 'armor', q) - R.gear.score(other, 'armor', p))[0];
          if (!repl) return 'equip: ' + id + ' is worn by ' + other.name + ' and there is no other armour for them';
        }
        R.say('equip: ' + U.itemName(id) + ' is on ' + other.name + ': taking it off first');
        const r = yield* O.equip(other.id, slot, repl, Object.assign({}, o, { direct: true }));
        if (r !== true) return r;
      }
    }
    if (id && !FF7.sys.inv.has(id)) return 'equip: no ' + id + ' in the bag';
    // the Equip screen lists the party only: a reserve member's pick waits until they join (R.joinGear), as a
    // player equips someone after a PHS swap (o.direct: taking a worn accessory off them, which can't wait)
    if (shown() && !inParty(ch) && !o.direct) {
      (R.gearLater[ch] = R.gearLater[ch] || {})[slot] = id;
      R.say('equip: ' + c.name + ' is in the reserve: ' + (id ? U.itemName(id) : 'nothing') + ' (' + slot + ') when they join');
      return true;
    }
    let done = false;
    if (shown() && inParty(ch)) done = yield* R.menus.run('equip ' + ch + ' ' + slot, R.menus.equip(ch, slot, id), () => c[slot] === id, o);
    else if (shown()) R.note('equip: ' + ch + ' is in the reserve (the menu lists the party): equipped directly');
    if (!done && c[slot] !== id) R.apply.equip(c, slot, id);
    R.say('equip: ' + c.name + ' ' + slot + ' = ' + (id ? U.itemName(id) : 'none'));
    return true;
  };
  // ['materia', char, id, 'weapon' | 'armor' | { slot, index }] (null id: take that slot's materia off)
  O.materia = function* (ch, id, where, o = {}) {
    const st = FF7.state, c = st.chars[ch];
    if (!c) return 'materia: ' + ch + ' is not in the group';
    const w = isObj(where) ? where : { slot: where };
    const keys = w.slot === 'armor' ? ['armorMateria'] : w.slot === 'weapon' ? ['weaponMateria'] : ['weaponMateria', 'armorMateria'];
    if (id == null) {
      const key = keys[0], k = w.index || 0;
      if (!c[key][k]) return true;
      let done = false;
      if (shown() && inParty(ch)) done = yield* R.menus.run('materia off ' + ch, R.menus.materiaTake(ch, key, k), () => !c[key][k], o);
      if (!done) R.apply.take(c, key, k);
      R.say('materia: ' + c.name + ' ' + key + '[' + k + '] off');
      return true;
    }
    const m = st.materia.find(x => x.id === id);
    if (!m) return 'materia: no ' + id + ' in stock';
    for (const key of keys) {
      const arr = c[key], k = w.index != null ? w.index : arr.findIndex(x => !x);
      if (k < 0 || k >= arr.length) continue;
      let done = false;
      if (shown() && inParty(ch)) done = yield* R.menus.run('materia ' + id + ' on ' + ch, R.menus.materiaPut(ch, key, k, st.materia.indexOf(m)), () => c[key][k] === m, o);
      else if (shown()) R.note('materia: ' + ch + ' is in the reserve (the Materia screen lists the party): put in directly');
      if (!done && c[key][k] !== m) R.apply.put(c, key, k, m);
      R.say('materia: ' + c.name + ' <- ' + matName(id));
      return true;
    }
    return 'materia: no free slot for ' + id + ' on ' + ch;
  };
  // ['row', char, 'front' | 'back']: Order (the character, twice)
  O.row = function* (ch, row, o = {}) {
    const c = FF7.state.chars[ch]; if (!c) return 'row: ' + ch + ' is not in the group';
    if (c.row === row) return true;
    let done = false;
    if (shown() && inParty(ch)) done = yield* R.menus.run('row ' + ch, R.menus.row(ch, row), () => c.row === row, o);
    if (!done) c.row = row;
    R.say('row: ' + c.name + ' ' + row);
    return true;
  };
  // ['party', [ids]]: the PHS (when the party can be changed), else the next party screen the story opens
  O.party = function* (ids, o = {}) {
    const st = FF7.state;
    if (o.select || !st.phsEnabled) { R.partyWant = ids.slice(); return true; }
    const missing = ids.filter(id => !st.members.includes(id));
    if (missing.length) return 'party: ' + missing.join(', ') + ' not in the group';
    const same = () => ids.every((id, i) => st.party[i] === id) && st.party.filter(Boolean).length === ids.length;
    if (same()) return true;
    let done = false;
    if (shown()) done = yield* R.menus.run('PHS ' + ids.join(','), R.menus.party(ids), same, o);
    if (!done) { FF7.sys.party.set(ids); const api = R.api(); if (api && api.refreshLeader) api.refreshLeader(); }
    R.say('party: ' + ids.join(', '));
    return true;
  };
  // ['useItem', item, char]: Item, the item, the character (an All item: everyone)
  O.useItem = function* (id, ch, o = {}) {
    const c = FF7.state.chars[ch || FF7.state.party[0]];
    if (!FF7.sys.inv.has(id)) return 'useItem: no ' + id;
    const n0 = FF7.sys.inv.count(id);
    if (shown() && c && inParty(c.id)) {
      const res = yield* R.menus.run('use ' + id + ' on ' + c.id, R.menus.useItem(id, c.id), () => FF7.sys.inv.count(id) < n0, Object.assign({ accept: /^no effect/ }, o));
      if (res === true) return true;
      if (typeof res === 'string') return 'useItem: ' + id + ' on ' + c.id + ': ' + res;
    }
    const def = FF7.data.items[id] || {};
    const r = FF7.sys.useItemField(id, c, /allAllies/.test(def.target || ''));
    if (!r.ok) return 'useItem: ' + id + ' on ' + (c && c.id) + ': ' + (r.msg || 'no effect');
    FF7.sys.inv.remove(id, 1);
    return true;
  };
  // ---- healing, like a careful player: the best means first (js/runner/menus.js works the screens)
  // Life on the KO'd (else a Phoenix Down); a Tent where one may be pitched (a save point, the world map)
  // when the party is badly hurt; Cure spells (All when several are hurt), the smallest that does the job;
  // then Potions / Hi-Potions / X-Potions (the smallest that does), keeping a reserve; Ethers for the
  // casters' MP. o: { below (0.7): heal whoever is under this share of max HP, to (1): up to this share
  // with spells, itemBelow (= below): items only under this share, mp: Ethers under this share of max MP
  // (0 = none), keepPotions (0), keepEthers (0), reserve: the reserve too, members: [ids] (only them),
  // spells, items, tent: false to leave those out }
  const HEAL_ITEMS = [['potion', 100], ['hi_potion', 500], ['x_potion', 9999]];
  R.healOf = (c, d, n) => { let h = 6 * (c.d.mag + c.level) + 22 * (d.power || 0); if (n > 1) h = Math.floor(h * 2 / 3); return h; };   // (the Magic screen's own formula)
  R.fieldSpellsOf = (c) => FF7.sys.materia.fieldSpells(c).map(sp => ({ id: sp.id, d: FF7.data.spells[sp.id], all: (sp.supports || []).some(x => x.id === 'all') || FF7.data.spells[sp.id].target === 'allAllies' })).filter(x => x.d);
  // a spell cast in the field: the Magic screen (the systems' fallback: the same formula)
  R.apply.cast = function (c, id, targets) {
    const d = FF7.data.spells[id]; if (!d || c.mp < d.mp) return false;
    let did = false;
    for (const t of targets) {
      if (d.kind === 'revive') { if (t.hp <= 0) { t.hp = Math.max(1, Math.floor(t.maxHp * (d.pct || 25) / 100)); did = true; } continue; }
      if (t.hp <= 0) continue;
      if (d.kind === 'heal' && t.hp < t.maxHp) { t.hp = Math.min(t.maxHp, t.hp + R.healOf(c, d, targets.length)); did = true; }
      if (d.kind === 'fullcure' && t.hp < t.maxHp) { t.hp = t.maxHp; did = true; }
      if (d.kind === 'cure' && d.remove) d.remove.forEach(x => { if (t.status && t.status[x]) { delete t.status[x]; did = true; } });
    }
    if (did) c.mp -= d.mp;
    return did;
  };
  R.castSpell = function* (c, id, targets, o = {}) {
    const mp0 = c.mp, all = targets.length > 1;
    if (shown() && inParty(c.id) && targets.every(t => inParty(t.id))) {
      if ((yield* R.menus.run('cast ' + id, R.menus.cast(c.id, id, all ? 'all' : targets[0].id), () => c.mp < mp0, Object.assign({ accept: /^no effect/ }, o))) === true) { R.say('magic: ' + c.name + ' casts ' + FF7.data.spells[id].name + ' on ' + (all ? 'everyone' : targets[0].name)); return true; }
    }
    if (c.mp < mp0) return true;
    const ok = R.apply.cast(c, id, targets);
    if (ok) R.say('magic: ' + c.name + ' casts ' + FF7.data.spells[id].name + ' on ' + (all ? 'everyone' : targets[0].name));
    return ok ? true : 'no effect';
  };
  // does c use MP (magic, summons or Enemy Skills that cost any)? -> gets Ethers from patchUp, counts as a caster
  R.usesMp = function (c) {
    if (!c || !c.maxMp) return false;
    const ab = FF7.sys.materia.abilities(c), E = FF7.data.eskills;
    return ab.spells.length > 0 || ab.summons.length > 0 || (ab.eskills || []).some(id => E[id] && (E[id].mp || 0) > 0);
  };
  R.patchUp = function* (o = {}) {
    const st = FF7.state, inv = FF7.sys.inv, keep = { keep: true };
    const ids = o.members ? o.members.filter(id => st.members.includes(id)) : st.party.filter(Boolean).concat(o.reserve ? st.members.filter(id => !st.party.includes(id) && !FF7.isGuest(id)) : []);
    const who = ids.map(id => st.chars[id]).filter(Boolean);
    const below = o.below != null ? o.below : 0.7, to = Math.max(below, o.to != null ? o.to : 1), itemBelow = o.itemBelow != null ? o.itemBelow : below;
    const keepP = o.keepPotions || 0, keepE = o.keepEthers || 0;
    const casters = () => FF7.sys.party.active().filter(c => c.hp > 0 && !(c.status && c.status.silence));
    // 1. the KO'd
    for (const t of who.filter(c => c.hp <= 0)) {
      const cs = o.spells === false ? null : casters().map(c => [c, R.fieldSpellsOf(c).find(x => x.d.kind === 'revive' && c.mp >= x.d.mp)]).find(x => x[1]);
      if (cs && inParty(t.id)) yield* R.castSpell(cs[0], cs[1].id, [t], keep);
      if (t.hp <= 0 && o.items !== false && inv.has('phoenix_down')) yield* O.useItem('phoenix_down', t.id, keep);
    }
    // (someone still down and no Life / Phoenix Down: a Tent where one may be pitched brings everyone back)
    if (who.some(c => c.hp <= 0 && inParty(c.id)) && o.items !== false && inv.has('tent') && ((R.field() && FF7.saveNearby) || R.worldScene())) yield* O.useItem('tent', FF7.sys.party.active()[0].id, keep);
    if (who.some(c => c.hp <= 0 && inParty(c.id))) R.note('heal: ' + who.filter(c => c.hp <= 0 && inParty(c.id)).map(c => c.name).join(', ') + ' down with nothing to revive them (no Life, Phoenix Down or Tent here)');
    // 2. a Tent (the whole party), where one may be pitched, when the party is badly hurt
    const active = FF7.sys.party.active();
    const missing = active.reduce((a, c) => a + (c.maxHp - c.hp) / Math.max(1, c.maxHp) + (c.maxMp ? (c.maxMp - c.mp) / c.maxMp : 0), 0) / Math.max(1, active.length * 2);
    if (o.tent !== false && o.items !== false && inv.has('tent') && missing > 0.5 && ((R.field() && FF7.saveNearby) || R.worldScene())) yield* O.useItem('tent', active[0].id, keep);
    // 3. Cure spells: the best healed-HP per MP, never much more than the wound
    for (let g = 0; g < 40 && o.spells !== false; g++) {
      const hurt = who.filter(c => c.hp > 0 && inParty(c.id) && c.hp < c.maxHp * below);
      if (!hurt.length) break;
      let best = null;
      for (const c of casters()) for (const sp of R.fieldSpellsOf(c)) {
        if (sp.d.kind !== 'heal' || c.mp < sp.d.mp || /regen/.test(sp.id)) continue;
        const group = sp.all && hurt.length > 1 ? who.filter(x => x.hp > 0 && inParty(x.id) && x.hp < x.maxHp * to) : [hurt.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
        if (sp.d.target === 'allAllies' && group.length === 1) continue;
        const h = R.healOf(c, sp.d, group.length);
        const healed = group.reduce((a, x) => a + Math.min(x.maxHp * to - x.hp, h), 0);
        const score = healed / (sp.d.mp + 1) - Math.max(0, h * group.length - healed) * 0.01;
        if (!best || score > best.score) best = { c, sp, group, score };
      }
      if (!best) break;
      if ((yield* R.castSpell(best.c, best.sp.id, best.group, keep)) !== true) break;
    }
    // 4. items for whoever is still under itemBelow: the smallest that does the job
    for (const c of who) {
      for (let g = 0; g < 20 && o.items !== false && c.hp > 0 && c.hp < c.maxHp * itemBelow; g++) {
        const need = c.maxHp * to - c.hp, have = HEAL_ITEMS.filter(([id]) => inv.count(id) > (c.hp < c.maxHp * 0.35 ? 0 : keepP));
        const pick = have.find(([, v]) => v >= need * 0.8) || have[have.length - 1];
        if (!pick) break;
        if ((yield* O.useItem(pick[0], c.id, keep)) !== true) break;
      }
    }
    // 5. Ethers for the members who use MP (magic, summons, Enemy Skills: R.usesMp) until they are at `mp` of
    // their max (Turbo Ethers for a big gap; o.elixir: an Elixir when the Ethers are gone)
    if (o.mp && o.items !== false) for (const c of who) {
      for (let g = 0; g < 12; g++) {
        if (c.hp <= 0 || !c.maxMp || c.mp >= c.maxMp * o.mp || !R.usesMp(c)) break;
        const it = c.maxMp - c.mp > 150 && inv.count('turbo_ether') > 0 ? 'turbo_ether' : inv.count('ether') > keepE ? 'ether' : inv.count('turbo_ether') > 0 ? 'turbo_ether' : o.elixir && inv.count('elixir') > 0 ? 'elixir' : null;
        if (!it) break;
        const mp0 = c.mp;
        if ((yield* O.useItem(it, c.id, keep)) !== true || c.mp <= mp0) break;
      }
    }
    if (R.menus) yield* R.menus.finish();
    return true;
  };
  // ['heal', { below, to, itemBelow, mp, reserve, members, keepPotions, keepEthers, spells, items, tent, elixir }]
  O.heal = function* (o = {}) { return yield* R.patchUp(o); };
  O.inn = function* (npc, o = {}) {
    R.choices.unshift({ a: 'Stay', pc: -1 });
    const r = yield* O.talk(npc, o);
    R.choices = R.choices.filter(c => c.pc !== -1);
    return r;
  };
  // where a shop is: an NPC id, an [x, y] tile (a counter, a vending machine), an object / talk-trigger id,
  // or { at: [x, y] } / { npc } / { object }
  R.visitShop = function* (where, o = {}) {
    if (isObj(where)) { o = Object.assign({}, where, o); where = where.at || where.npc || where.object || where.shop; }
    if (Array.isArray(where)) return yield* O.use(where[0], where[1], o);
    const fs = R.field();
    const a = fs && fs.actors[where];
    if (fs && !(a && a.def)) {
      const ob = fs.objects.find(x => x.id === where) || (fs.map.triggers || []).find(t => t.id === where && t.on === 'talk');
      if (ob) return yield* O.use(ob.at[0], ob.at[1], o);
    }
    return yield* O.talk(where, o);
  };
  O.shop = function* (npc, spec = {}) {
    if (isObj(npc)) { spec = Object.assign({}, npc, spec); npc = null; }
    const where = npc != null ? npc : (spec.at || spec.npc || spec.object || spec.shop);
    if (where == null) return 'shop: where? (an NPC id, [x, y] or { at: [x, y] })';
    const listOf = (x) => Array.isArray(x) ? x.map(e => Array.isArray(e) ? { id: e[0], qty: e[1] == null ? 1 : e[1] } : { id: e, qty: 1 }) : Object.keys(x || {}).map(id => ({ id, qty: x[id] }));
    R.shopTask = { buy: listOf(spec.buy), sell: listOf(spec.sell), closed: false };
    const r = yield* R.visitShop(where, spec);
    const t = R.shopTask; R.shopTask = null;
    if (r !== true) return r;
    const failed = t.buy.concat(t.sell).filter(e => e.failed || !e.done);
    return failed.length && !spec.lenient ? 'shop: could not ' + failed.map(e => e.id).join(', ') : true;
  };
  // ---- fighting random battles (level, fightUntil): pacing two tiles back and forth, patched up after
  // every battle (R.patchUp: Cure to full, items under half HP, Ethers under 30% MP, Tents at save points),
  // resting (o.rest) when that isn't enough, or every `per` battles. o: { at: mapId (fight there), rest:
  // npcId (an inn here) | [mapId, x, y] (a bed / counter: "Stay") | { map, npc } | { map, at: [x, y] },
  // per, max (battles), hp, mp, keepPotions (4), keepEthers (1), all }
  R.rest = function* (rest) {
    const sp = typeof rest === 'string' ? { npc: rest } : Array.isArray(rest) ? { map: rest[0], at: [rest[1], rest[2]] } : rest;
    if (sp.map && R.where() !== sp.map) { const g = yield* O.goto(sp.map); if (g !== true) return 'rest: ' + g; }
    R.choices.unshift({ a: 'Stay', pc: -2 });
    let r;
    try { r = sp.npc ? yield* O.talk(sp.npc, {}) : yield* O.use(sp.at[0], sp.at[1], {}); } finally { R.choices = R.choices.filter(c => c.pc !== -2); }
    if (r === true) R.say('rested (' + (sp.npc || sp.at.join(',')) + ')');
    return r === true ? true : 'rest: ' + r;
  };
  R.grind = function* (stop, o, what) {
    const heal = () => R.patchUp({ below: o.hp || 0.9, itemBelow: 0.5, mp: o.mp != null ? o.mp : 0.3, keepPotions: o.keepPotions != null ? o.keepPotions : 4, keepEthers: o.keepEthers != null ? o.keepEthers : 1, elixir: !!o.elixir });
    const weak = () => FF7.sys.party.active().some(c => c.hp < c.maxHp * 0.4);
    const dry = () => { const cs = FF7.sys.party.active().filter(c => R.usesMp(c)); return cs.length && cs.every(c => c.mp < c.maxMp * 0.2); };
    // (at: a map id, or a world tile [x, y]: flown / walked there, then on foot: vehicles meet no battles)
    if (Array.isArray(o.at)) {
      const ws0 = R.worldScene(), D0 = R.worldD();
      if (!ws0 || Math.max(Math.abs(wrapD(Math.floor(ws0.px) - o.at[0], D0.w)), Math.abs(wrapD(Math.floor(ws0.pz) - o.at[1], D0.h))) > 3) { const g = yield* O.world(o.at); if (g !== true) return what + ': ' + g; }
    } else if (o.at && R.where() !== o.at) { const g = yield* O.goto(o.at); if (g !== true) return what + ': ' + g; }
    const home = R.where();
    R.grindDry = false;
    yield* heal();
    let b0 = R.stats.battles, lastB = R.frames, side = 0, fought = 0, since = 0;
    while (!stop()) {
      if (R.stats.battles !== b0) {
        const n = R.stats.battles - b0; fought += n; since += n; b0 = R.stats.battles; lastB = R.frames;
        yield* heal();
        if (o.stopIf && R.cond(o.stopIf)) { R.note(what + ': stopped (' + R.stepText([o.stopIf]) + ')'); return true; }
        if (stop()) break;
        if (o.max && fought >= o.max) { R.note(what + ': stopped after ' + fought + ' battles'); return true; }
        if (o.rest && ((o.per && since >= o.per) || weak() || dry())) {
          const r = yield* R.rest(o.rest); if (r !== true) return what + ': ' + r;
          since = 0;
          if (R.where() !== home) { const g = yield* O.goto(home); if (g !== true) return what + ': ' + g; }
          b0 = R.stats.battles; lastB = R.frames;
        } else if (!o.rest && (weak() || (o.restDry && dry()))) {
          // (a Tent where one may be pitched - the world map, a save point: this map's, walked to - before giving up)
          let canTent = FF7.sys.inv.count('tent') > 0 && (R.worldScene() || (R.field() && FF7.saveNearby));
          if (!canTent && FF7.sys.inv.count('tent') > 0 && R.field() && (yield* R.toSavePoint())) canTent = true;
          if (canTent) { yield* O.useItem('tent', FF7.sys.party.active()[0].id); if (!weak()) continue; }
          R.note(what + ': stopped (out of healing, ' + fought + ' battles)'); R.grindDry = true; return true;   // (R.grindDry: callers that loop over grinds stop too)
        }
      }
      if (R.frames - lastB > 20000) { if (o.soft) { R.note(what + ': no battles here (' + R.where() + ')'); return true; } return what + ': no battles here (' + R.where() + ')'; }
      const fs = R.field(), ws = R.worldScene();
      if (fs) {
        const p = fs.player, pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y));
        if (!pairs.length) return what + ': no room to pace here';
        const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return what + ': ' + r;
      } else if (ws && ws.vehicle) {
        yield* R.pressWorld(ws.vehicle === 'chocobo' ? 'cancel' : 'ok');           // (off / land: no battles in a vehicle)
        const w2 = R.worldScene(); if (w2 && w2.vehicle) return what + ': cannot get off the ' + w2.vehicle + ' here';
      } else if (ws) {
        const x = Math.floor(ws.px), y = Math.floor(ws.pz);
        const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !R.entries()[mod(a, R.worldD().w) + ',' + mod(b, R.worldD().h)]);
        if (!pairs.length) return what + ': no room to pace here';
        const r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true) return what + ': ' + r;
      } else yield;
    }
    return true;
  };
  // ['level', n, { all, at, rest, per, max, hp, mp, keepPotions, keepEthers }]: random battles until the
  // (active) party's average level is n (with max: stops, noted, after that many battles)
  // (o.min: and every active member at least that level - an average hid Barret at 43 beside Cloud at 52, and the
  // Turks knocked him out first)
  O.level = function* (n, o = {}) { return yield* R.grind(() => R.avgLevel(o.all) >= n && (!o.min || FF7.sys.party.active().every(c => c.level >= o.min)), o, 'level'); };
  // ['fightUntil', cond, { max (12), stopIf, at, rest, ... }]: random battles until cond holds (a steal,
  // an Enemy Skill, gil); never fails: after max battles (or with no battles here) it is noted
  O.fightUntil = function* (cond, o = {}) { const r = yield* R.grind(() => R.cond(cond), Object.assign({ max: 12, soft: true }, o), 'fightUntil'); if (r === true && !R.cond(cond)) R.note('fightUntil: ' + R.stepText([cond]) + ' did not happen'); return r; };

  // ---- world map
  // ['world', loc | [x, y], { vehicle, via: 'chocobo', color }]: via a chocobo (js/runner/chocobo.js: the one
  // ridden, a stabled one of that colour, or a wild one caught on the way; flown in the Highwind when the
  // place is on another landmass); [x, y]: a world tile (no entry)
  O.world = function* (loc, o = {}) {
    if (o.via === 'chocobo' && O.ride) {
      if (R.where() !== 'world') { const g = yield* R.gotoMap('world', o); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
      const r = yield* O.ride(o.color || null, { to: loc }); if (r !== true) return r;
      if (R.choco && !R.choco.canRide(loc)) { const r2 = yield* R.choco.airlift(loc); if (r2 !== true) return r2; }   // another landmass: in the Highwind
    }
    if (Array.isArray(loc)) {
      if (R.where() !== 'world') { const g = yield* R.gotoMap('world', o); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
      let ws = R.worldScene(); if (!ws) return 'world: not on the world map';
      const here = () => [Math.floor(ws.px), Math.floor(ws.pz)];
      // (a tile out of reach on foot / in this vehicle: the Highwind - boarded when parked - lands as near as it
      // can on ground from which the tile is walked to)
      if (ws.vehicle === 'highwind' || !R.worldPath(ws, here()[0], here()[1], [loc], ws.vehicle, o)) {
        const hw = FF7.state.world.vehicles && FF7.state.world.vehicles.highwind;
        if (ws.vehicle !== 'highwind' && hw) { const b = yield* R.boardVehicle('highwind'); if (b !== true) return 'world: ' + b; ws = R.worldScene(); }
        if (ws && ws.vehicle === 'highwind') {
          const L = { x: loc[0], y: loc[1] }, near = (q) => Math.hypot(wrapD(q[0] - L.x, R.worldD().w), wrapD(q[1] - L.y, R.worldD().h));
          const spots = (LANDABLE.includes(worldTile(L.x, L.y)) && !R.entries()[mod(L.x, R.worldD().w) + ',' + mod(L.y, R.worldD().h)] ? [[L.x, L.y]] : []).concat(R.approach(ws, 'highwind', L).sort((a, b) => near(a) - near(b)));
          const spot = spots.find(q => R.worldPath(ws, q[0], q[1], [loc], null, o)) || spots[0];
          if (!spot) return 'world: nowhere to land near ' + loc.join(',');
          const f = yield* R.fly(spot[0], spot[1]); if (f !== true) return 'world: ' + f;
          yield* R.pressWorld('ok');
          ws = R.worldScene(); if (!ws) return 'world: the landing went elsewhere';
        }
      }
      const r = yield* R.walkWorld([loc], Object.assign({}, o, { anywhere: true }));
      return r === true ? true : 'world: ' + r;
    }
    return yield* R.worldTo(loc, o);
  };
  O.board = function* (id) { if (R.where() !== 'world') return 'board: not on the world map'; return yield* R.boardVehicle(id); };
  O.land = function* () { const ws = R.worldScene(); if (!ws || !ws.vehicle) return 'land: not in a vehicle'; yield* R.pressWorld('ok'); return R.worldScene() && R.worldScene().vehicle ? 'land: cannot get off here' : true; };
  O.dive = function* () { const ws = R.worldScene(); if (!ws || ws.vehicle !== 'submarine') return 'dive: not in the submarine'; yield* R.pressWorld('square'); return true; };
  O.interior = function* () { const ws = R.worldScene(); if (!ws || !ws.vehicle) return 'interior: not in a vehicle'; yield* R.pressWorld('square'); return R.where() !== 'world' ? true : 'interior: no way inside'; };

  // ================================================================== status / report
  R.status = function () {
    const fs = R.field() || (R.where() && R.where() !== 'world' ? FF7.fieldScene : null), ws = R.worldScene() || FF7.worldScene;
    const st = FF7.state, top = R.top();
    const onWorld = R.where() === 'world';
    return {
      active: R.active, state: R.statusText, mode: R.opts && R.opts.mode,
      map: R.where(), pos: onWorld && ws ? [Math.floor(ws.px), Math.floor(ws.pz)] : fs && fs.player ? [fs.player.tx, fs.player.ty] : null,
      step: R.pc, of: (R.plan || []).length, op: R.stepText(R.plan && R.plan[R.pc]), chapter: R.chapter, objective: R.objective,
      frames: R.frames, time: st ? Math.round(st.time) : 0, top: top ? (top.isBattle ? 'battle' : top.isTitle ? 'title' : top.isMinigame ? 'minigame' : R.isMovie(top) ? 'movie' : R.isField(top) ? 'field' : R.isWorld(top) ? 'world' : (top.constructor && top.constructor.name)) : null,
      party: st ? st.party.filter(Boolean).map(id => { const c = st.chars[id]; return c ? c.name + ' L' + c.level + ' ' + c.hp + '/' + c.maxHp : id; }) : [],
    };
  };
  R.report = function () {
    const st = FF7.state || {}, s = R.status();
    return Object.assign(s, {
      chapterTitle: R.chapterTitle, playtime: U.fmtTime(st.time || 0), gil: st.gil, flags: Object.keys(st.flags || {}).length,
      items: (st.items || []).map(e => U.itemName(e.id) + ' x' + e.qty), materia: (st.materia || []).map(m => m.id),
      received: R.stats && R.stats.received, drops: R.stats && R.stats.drops,
      battles: R.stats && { total: R.stats.battles, won: R.stats.won, escaped: R.stats.escaped, lost: R.stats.lost, gameOvers: R.stats.gameOvers },
      steals: R.stats && R.stats.steals, stealTries: R.stats && (R.stats.stealTries || 0), eskills: R.stats && R.stats.eskills, minigames: R.stats && R.stats.minigames, choices: R.stats && R.stats.choices,
      saves: R.stats && R.stats.saves, restores: R.stats && R.stats.restores,
      issues: R.issues, notes: (R.notes || []).slice(-40), log: (R.log || []).slice(-60),
    });
  };

  // ================================================================== static plan check (tools/run_runner.js --check)
  R.lint = function (chapters) {
    const out = [];
    const known = new Set(Object.keys(R.ops));
    (chapters || Object.keys(R.plans)).forEach(ch => {
      const plan = R.plans[ch]; if (!plan) return;
      if (!Array.isArray(plan)) { out.push(ch + ': not an array'); return; }
      const ctx = R.contexts(plan);
      plan.forEach((s0, i) => {
        const s = norm(s0); const at = ch + '[' + i + '] ' + R.stepText(s);
        if (!Array.isArray(s) || !known.has(s[0])) { out.push(at + ': unknown op'); return; }
        const mapOk = (m) => m === 'world' || !!FF7.maps[m];
        if ((s[0] === 'goto' || s[0] === 'expectMap') && !mapOk(s[1])) out.push(at + ': no map ' + s[1]);
        if ((s[0] === 'item' || s[0] === 'chest') && !R.findPickup(s[1])) out.push(at + ': no item/chest with id ' + s[1]);
        if (s[0] === 'talk' && !R.npcMaps(s[1]).length && !(stepOpts(s).map)) out.push(at + ': (warning) no map defines an NPC ' + s[1] + ' (spawned by a script?)');
        if (s[0] === 'talk' && ctx[i] && R.npcMaps(s[1]).length && !R.npcMaps(s[1]).includes(ctx[i])) out.push(at + ': (warning) ' + s[1] + ' is not an NPC of ' + ctx[i]);
        if (s[0] === 'world' && !Array.isArray(s[1]) && !FF7.world.location(s[1])) out.push(at + ': no world location ' + s[1]);
        if (s[0] === 'chocoboFarm' && !['rent', 'move', 'feed', 'mate', 'ride', 'release'].includes(s[1])) out.push(at + ': chocoboFarm: unknown action ' + s[1]);
        if (s[0] === 'equip' && s[3] && !U.findItem(s[3])) out.push(at + ': no item ' + s[3]);
        if (s[0] === 'materia' && s[2] && !FF7.data.materia[s[2]]) out.push(at + ': no materia ' + s[2]);
        if (s[0] === 'moveMateria' && s[3] && !FF7.data.materia[s[3]]) out.push(at + ': no materia ' + s[3]);
        if (s[0] === 'loadout') { const sp = s[2] || {}; const ids = [].concat(Array.isArray(sp) ? sp : [].concat(sp.weapon || [], sp.armor || [])).flat().filter(x => typeof x === 'string' && x !== '*'); ids.forEach(id => { if (!FF7.data.materia[id]) out.push(at + ': no materia ' + id); }); if (!FF7.data.characters[s[1]]) out.push(at + ': no character ' + s[1]); }
        const shopOk = (w) => R.npcMaps(w).length || Object.keys(FF7.maps).some(m => [].concat(FF7.maps[m].objects || [], FF7.maps[m].triggers || []).some(x => x && x.id === w));
        if (s[0] === 'gear') { const g = isObj(s[1]) ? s[1] : {}, w = g.shop || g.npc || g.at; if (!w) out.push(at + ': gear needs { shop: npcId | [x, y] }'); else if (typeof w === 'string' && !shopOk(w)) out.push(at + ': (warning) no map defines an NPC or object ' + w); }
        if (s[0] === 'shop' && typeof s[1] === 'string' && !shopOk(s[1])) out.push(at + ': (warning) no map defines an NPC or object ' + s[1]);
        if (s[0] === 'minigame' && FF7.minigames.defs && !FF7.minigames.defs[s[1]]) out.push(at + ': no minigame ' + s[1]);
        if ((s[0] === 'walk' || s[0] === 'use') && (typeof s[1] !== 'number' || typeof s[2] !== 'number')) out.push(at + ': needs x, y');
        if ((s[0] === 'walk' || s[0] === 'use') && ctx[i] && FF7.maps[ctx[i]]) { const P = F.parseMap(FF7.maps[ctx[i]]); if (s[0] === 'walk' && !P.walkable(s[1], s[2])) out.push(at + ': ' + s[1] + ',' + s[2] + ' is not walkable on ' + ctx[i]); }
      });
    });
    return out;
  };
})();

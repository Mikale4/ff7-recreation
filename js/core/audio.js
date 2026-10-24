// Audio: background music (bgm/*.mp3) and sound effects (sfx/web/*.mp3, made from the original WAVs kept in references/sfx_originals/) via HTMLAudioElement,
// which also works from file://. Track ids are mapped to files in js/data/audio_map.js.
(function () {
  const A = FF7.audio = {
    musicVol: 0.7, sfxVol: 0.8,
    unlocked: false,
    current: null,        // { id, el }
    fading: [],           // elements fading out
    pending: null,        // track requested before unlock
    stack: [],            // saved tracks (field music while in battle)
    sfxPool: {},
  };

  // what media this copy of the game has: the public web copy leaves out the original game's music, sound effects and
  // movies (bgm/, sfx/, assets/movies/: they stay on the player's own PC), so the first time each kind is wanted one
  // file of it is asked for; if it isn't there, that kind is left out quietly (no music, no sound effects; the story's
  // movies play as their real-time cinematics, js/gfx/fmv.js). From file:// (no way to ask) everything is assumed there
  const has = {};
  FF7.mediaHas = function (kind, url) {
    if (kind in has) return has[kind];
    if (typeof XMLHttpRequest === 'undefined' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return (has[kind] = true);
    try { const x = new XMLHttpRequest(); x.open('HEAD', url, false); x.send(null); has[kind] = x.status >= 200 && x.status < 400; } catch (e) { has[kind] = true; }
    return has[kind];
  };
  function musicFile(id) { const m = FF7.AUDIO_MAP && FF7.AUDIO_MAP.music, f = m && m[id] ? 'bgm/' + m[id] : null; return f && FF7.mediaHas('music', f) ? f : null; }
  function sfxFile(id) { const m = FF7.AUDIO_MAP && FF7.AUDIO_MAP.sfx, f = m && m[id] ? 'sfx/web/' + m[id] : null; return f && FF7.mediaHas('sfx', f) ? f : null; }

  A.unlock = function () {
    if (A.unlocked) return;
    A.unlocked = true;
    if (A.pending) { const p = A.pending; A.pending = null; A.play(p.id, p.opts); }
    else if (A.current && A.current.el.paused) A.current.el.play().catch(() => {});
  };

  // Play a music track. opts: { loop=true, fade=frames (default 30), restart=false, volume=1 }
  A.play = function (id, opts = {}) {
    if (!id) return A.stop();
    if (A.current && A.current.id === id && !opts.restart) return;
    if (!A.unlocked) { A.pending = { id, opts }; if (A.current) A.stop(0); A.currentId = id; return; }
    const file = musicFile(id);
    A.stop(opts.fade != null ? opts.fade : 30);
    A.currentId = id;
    if (!file) { A.current = null; return; }
    const el = new Audio(file);
    el.loop = opts.loop !== false;
    el.volume = 0;
    el._target = (opts.volume != null ? opts.volume : 1);
    el._fadeIn = opts.fadeIn != null ? opts.fadeIn : 20;
    if (opts.at) { try { el.currentTime = opts.at; } catch (e) { } }
    el.play().catch(() => {});
    A.current = { id, el };
  };

  // Stop music with a fade-out over `fade` frames.
  A.stop = function (fade = 30) {
    A.pending = null;
    if (!A.current) return;
    const el = A.current.el;
    el._fadeOut = Math.max(1, fade);
    el._fadeFrom = el.volume;
    el._fadeT = 0;
    A.fading.push(el);
    A.current = null;
    A.currentId = null;
  };

  // Save the current track (e.g. before battle) and play another.
  A.push = function (id, opts) {
    const cur = A.current;
    A.stack.push(cur ? { id: cur.id, time: cur.el.currentTime } : (A.currentId ? { id: A.currentId, time: 0 } : null));
    if (cur) {
      // keep the element paused so we can resume it
      A.fading.push(Object.assign(cur.el, { _fadeOut: 8, _fadeFrom: cur.el.volume, _fadeT: 0, _pauseOnly: true }));
      A.current = null;
    }
    A.play(id, Object.assign({ fade: 0, restart: true }, opts));
  };
  // Return to the saved track (resuming where it left off).
  A.pop = function (fade = 20) {
    const prev = A.stack.pop();
    A.stop(fade);
    if (prev) A.play(prev.id, { at: prev.time, restart: true, fadeIn: 40 });
  };

  A.update = function () {
    const mv = A.musicVol;
    if (A.current) {
      const el = A.current.el;
      if (el._fadeIn > 0) {
        el._fi = (el._fi || 0) + 1;
        el.volume = Math.min(1, (el._fi / el._fadeIn)) * el._target * mv;
        if (el._fi >= el._fadeIn) el._fadeIn = 0;
      } else el.volume = el._target * mv;
    }
    for (let i = A.fading.length - 1; i >= 0; i--) {
      const el = A.fading[i];
      el._fadeT++;
      const t = el._fadeT / el._fadeOut;
      el.volume = Math.max(0, el._fadeFrom * (1 - t));
      if (t >= 1) {
        el.pause();
        if (!el._pauseOnly) { el.src = ''; }
        A.fading.splice(i, 1);
      }
    }
  };

  // Sound effect. Uses a small pool per effect so rapid repeats overlap.
  A.sfx = function (id, vol = 1) {
    if (!A.unlocked) return;
    const file = sfxFile(id);
    if (!file) return;
    let pool = A.sfxPool[id];
    if (!pool) pool = A.sfxPool[id] = [];
    let el = pool.find(e => e.paused || e.ended);
    if (!el) {
      if (pool.length >= 4) { el = pool[0]; el.pause(); }
      else { el = new Audio(file); pool.push(el); }
    }
    const fi = A.fading.indexOf(el); if (fi >= 0) A.fading.splice(fi, 1);   // (played again while being cut off)
    if (A.SCENE_SFX[id]) A.scenePlaying = true;
    try { el.currentTime = 0; } catch (e) { }
    el.volume = FF7.util.clamp(A.sfxVol * vol, 0, 1);
    el.play().catch(() => {});
    // a sound longer than its moment is cut short with a quick fade (A.SFX_CUT: the fire spells' roar ran on for 3-6
    // seconds after the spell was over); the play's own token, so a newer play of the same sound isn't cut
    const cut = A.SFX_CUT[id];
    if (cut) {
      const tok = el._playTok = (el._playTok || 0) + 1;
      setTimeout(() => {
        if (el._playTok !== tok || el.paused || el.ended || A.fading.includes(el)) return;
        A.fading.push(Object.assign(el, { _fadeOut: 18, _fadeFrom: el.volume, _fadeT: 0, _pauseOnly: true }));
      }, cut * 1000);
    }
  };
  // how long a sound effect plays at most, in seconds (then a fade of about a third of a second): Fire.wav (the Fire
  // spells, Flamethrower) is 5.8 s of roar and Fire2.wav (Fire 2/3, Flare, explosions, summons) 3.5 s; the user,
  // 2026-10-02: "it lasts for too long". Both games share these sounds
  A.SFX_CUT = { fire: 1.2, fire2: 1.7 };

  A.stopSfx = function (id) {
    const pool = A.sfxPool[id];
    if (pool) pool.forEach(e => e.pause());
  };
  // Sounds that belong to the scene that plays them (the alarms: Alarm2 runs 20 seconds): cut off, with a short fade,
  // once that scene is over, instead of running on into whatever comes next. The field cuts them when the player has
  // control again (js/field/field.js); a movie as it ends or is skipped (js/gfx/cinema.js); the trip to the world map
  // and loading a file too. (A battle cuts every sound: stopAllSfx.)
  A.SCENE_SFX = { alarm: 1, alarm_long: 1, alarm_short: 1 };
  A.scenePlaying = false;
  A.stopSceneSfx = function (fade = 15) {
    A.scenePlaying = false;
    for (const id in A.SCENE_SFX) (A.sfxPool[id] || []).forEach(e => {
      if (e.paused || e.ended || A.fading.includes(e)) return;
      A.fading.push(Object.assign(e, { _fadeOut: Math.max(1, fade), _fadeFrom: e.volume, _fadeT: 0, _pauseOnly: true }));
    });
  };
  // every sound effect still playing (a battle cuts off the field's alarms, machinery and so on, as in FF7)
  A.stopAllSfx = function () {
    A.scenePlaying = false;
    for (const id in A.sfxPool) A.sfxPool[id].forEach(e => { if (!e.paused) e.pause(); });
  };
})();

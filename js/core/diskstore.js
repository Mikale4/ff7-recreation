// Saves on disk (tools/serve.py): the game keeps its saves in the browser's storage (localStorage), and a browser can
// lose that storage (a private window, cleared site data, or the Claude app's preview pane, whose storage lives only in
// memory: every save went when the app restarted; the user, 2026-10-04, "why isnt there a folder or something made for
// stored data?"). So every save the game writes (the keys starting ff7js_) is copied to the local server, which keeps
// it as a file in saves/; and at boot, before anything reads a save, any the browser lacks are put back from there.
// From file:// or another server (no /__saves) it does nothing and the game works as before, browser storage only.
(function () {
  const DS = FF7.diskstore = { ok: false, restored: [], pending: {} };
  if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return;
  let ls; try { ls = window.localStorage; } catch (e) { return; }
  if (!ls) return;
  const mine = (k) => typeof k === 'string' && k.indexOf('ff7js_') === 0;
  // 1. at boot: what's on disk (a synchronous request, so the saves are in place before the title reads them)
  let disk = null;
  try {
    const x = new XMLHttpRequest();
    x.open('GET', '/__saves', false);
    x.send(null);
    if (x.status === 200) disk = JSON.parse(x.responseText);
  } catch (e) { disk = null; }
  if (!disk || typeof disk !== 'object') return;
  DS.ok = true;
  for (const k of Object.keys(disk)) {
    if (!mine(k) || typeof disk[k] !== 'string') continue;
    try { if (ls.getItem(k) == null) { ls.setItem(k, disk[k]); DS.restored.push(k); } } catch (e) { }
  }
  // 2. every write from now on goes to disk too (a moment later, coalesced: the Demo saves often)
  const send = (k, sync) => {
    const v = DS.pending[k]; delete DS.pending[k];
    const url = '/__save?k=' + encodeURIComponent(k);
    try {
      if (sync) { const x = new XMLHttpRequest(); x.open(v == null ? 'DELETE' : 'PUT', url, false); x.send(v == null ? null : v); return; }
      fetch(url, { method: v == null ? 'DELETE' : 'PUT', body: v == null ? undefined : v, keepalive: v != null && v.length < 60000 }).catch(() => { });
    } catch (e) { }
  };
  const timers = {};
  const queue = (k, v) => {
    DS.pending[k] = v;
    clearTimeout(timers[k]);
    timers[k] = setTimeout(() => { delete timers[k]; if (k in DS.pending) send(k, false); }, 300);
  };
  const SP = Storage.prototype, set0 = SP.setItem, rem0 = SP.removeItem;
  SP.setItem = function (k, v) { set0.call(this, k, v); if (this === ls && mine(k)) queue(k, String(v)); };
  SP.removeItem = function (k) { rem0.call(this, k); if (this === ls && mine(k)) queue(k, null); };
  // (closing the window: whatever is still waiting goes now)
  window.addEventListener('pagehide', () => { for (const k of Object.keys(DS.pending)) { clearTimeout(timers[k]); send(k, true); } });
  // 3. saves this browser has that the disk doesn't yet (the first run with the server): copied over
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (mine(k) && !(k in disk)) queue(k, ls.getItem(k)); }
})();

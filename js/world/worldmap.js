// World map: location links (registry used by field map files). The 3D world scene is in
// js/world/worldscene.js.
(function () {
  const WM = FF7.world;
  WM._links = {};
  // FF7.world.link('kalm', { map: 'kalm_gate', entry: 'from_world', if: s => ..., run: function*(s){} })
  WM.link = function (loc, def) {
    (WM._links[loc] = WM._links[loc] || []).push(Object.assign({ file: (document.currentScript && document.currentScript.src) || '' }, def));
  };
  // Conditional links (with `if`) win over unconditional ones, so a later chapter can override a
  // location for part of the story; among several passing links, higher `priority` wins, then order.
  WM.linkFor = function (loc, api) {
    const list = (WM._links[loc] || []).map((l, i) => ({ l, i })).sort((a, b) => ((b.l.priority || 0) - (a.l.priority || 0)) || a.i - b.i).map(o => o.l);
    for (const l of list) {
      if (!l.if) continue;
      try { if (l.if(api)) return l; } catch (e) { console.error(e); }
    }
    return list.find(l => !l.if) || null;
  };
  WM.location = function (id) {
    const W = FF7.data.world;
    return W ? W.locations.find(l => l.id === id) : null;
  };
})();

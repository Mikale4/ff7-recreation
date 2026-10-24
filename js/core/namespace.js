// Global namespace. Every other file attaches to FF7.* — plain scripts, no modules,
// so the game runs straight from file:// by opening index.html.
var FF7 = window.FF7 = window.FF7 || {};
FF7.VERSION = '1.0.0';
FF7.W = 640;   // logical screen width
FF7.H = 480;   // logical screen height

// Static game data tables. Data files do: Object.assign(FF7.data.items, { ... })
FF7.data = {
  items: {},        // consumables (js/data/items.js)
  keyItems: {},     // key items
  weapons: {},
  armor: {},
  accessories: {},
  materia: {},
  spells: {},       // magic spells granted by magic materia
  summons: {},
  eskills: {},      // enemy skills
  limits: {},
  characters: {},
  enemies: {},
  encounters: {},   // encounter tables: id -> [{e:[enemyIds], w:weight, type?}]
  shops: {},
  world: null,      // world map (js/data/world_map.js)
  fxAtlas: {},      // PS1 effect sheets: no longer loaded (all battle effects are procedural; see js/gfx/fx.js)
};

FF7.maps = {};      // field maps, registered with FF7.defineMap(id, def)
FF7.scenes = {};    // scene classes
FF7.ui = {};        // UI helpers
FF7.gfx = {};       // procedural graphics
FF7.sys = {};       // game systems (stats, materia, inventory)
FF7.battle = {};    // battle system
FF7.field = {};     // field system
FF7.world = {};     // world map system
FF7.minigames = {}; // minigame scenes
FF7.story = {};     // shared story scripts (generator functions) — FF7.story.<id> = function*(s){...}

FF7.defineMap = function (id, def) {
  if (FF7.maps[id]) console.warn('Map redefined:', id);
  def.id = id;
  FF7.maps[id] = def;
  FF7.applyPatches(id);
  return def;
};
// Add npcs / objects / triggers / items / chests / exits / lights to a map defined in another file
// (used by optional-content chapters). Works whether the target map is defined before or after.
FF7.mapPatches = {};
FF7.patchMap = function (id, patch) {
  (FF7.mapPatches[id] = FF7.mapPatches[id] || []).push(patch);
  if (FF7.maps[id]) FF7.applyPatches(id);
};
FF7.applyPatches = function (id) {
  const map = FF7.maps[id], list = FF7.mapPatches[id];
  if (!map || !list) return;
  map._patches = map._patches || [];
  for (const p of list) {
    if (map._patches.includes(p)) continue;
    map._patches.push(p);
    for (const k of ['npcs', 'objects', 'triggers', 'items', 'chests', 'exits', 'lights']) if (p[k]) map[k] = (map[k] || []).concat(p[k]);
    if (p.onEnter) { const a = map.onEnter, b = p.onEnter; map.onEnter = a ? function* (s) { yield* a(s); yield* b(s); } : b; }
    if (p.onLoad) { const a = map.onLoad, b = p.onLoad; map.onLoad = a ? function (s) { a(s); b(s); } : b; }
  }
};

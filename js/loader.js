// Script loader. Loads every game file in order with classic <script> tags so the game
// works from file:// (no fetch / modules needed). Add new files to the lists below —
// tools/validate.js checks that every .js file under js/ is listed here.
(function () {
  var CORE = [
    'js/core/diskstore.js',   // (first: the saves on disk are put back before anything reads them)
    'js/core/util.js',
    'js/core/input.js',
    'js/core/audio.js',
    'js/core/render.js',
    'js/core/coroutine.js',
    'js/core/scene.js',
    'js/core/state.js',
    'js/core/save.js',

    'js/gl/math.js',
    'js/gl/glr.js',
    'js/gl/meshkit.js',
    'js/gl/tex.js',
    'js/gl/skel.js',
    'js/gl/models_lib.js',
    'js/gl/humanoid.js',
    'js/gl/cast_models.js',
    'js/gl/weapons_cloud.js',
    'js/gl/cast_rigs.js',
    'js/gl/cast_npcs.js',
    'js/gl/creatures.js',
    'js/gl/enemy_models_d1a.js',
    'js/gl/enemy_models_d1b.js',
    'js/gl/enemy_models_d23.js',
    'js/gl/summon_models.js',
    'js/gl/vehicles.js',
    'js/gl/arena.js',

    'js/gfx/fx.js',
    'js/gfx/fx_summons.js',
    'js/gfx/cinema.js',
    'js/gfx/fmv.js',

    'js/systems/stats.js',
    'js/systems/inventory.js',
    'js/systems/materia.js',
    'js/systems/party.js',
    'js/systems/achievements.js',   // achievements (not in the PS1 game): the title screen lists them

    'js/ui/icons.js',
    'js/ui/widgets.js',
    'js/ui/menu_main.js',
    'js/ui/menu_items.js',
    'js/ui/menu_materia.js',
    'js/ui/menu_equip.js',
    'js/ui/menu_status.js',
    'js/ui/shop.js',
    'js/ui/save_menu.js',

    'js/battle/combatant.js',
    'js/battle/formulas.js',
    'js/battle/actions.js',
    'js/battle/specials.js',
    'js/battle/ai.js',
    'js/battle/bmenu.js',
    'js/battle/battle.js',
    'js/battle/summon_seq.js',
    'js/battle/victory.js',

    'js/field/themes.js',
    'js/field/tiles.js',
    'js/field/props_forest.js',
    'js/field/floortex.js',
    'js/field/fieldgeo.js',
    'js/field/actors.js',
    'js/field/script.js',
    'js/field/field.js',

    'js/world/worldmap.js',
    'js/world/worldscene.js',

    'js/scenes/title.js',
    'js/ui/theater.js',              // the Theater on the title screen (story cutscenes, unlocked as you reach them)
    'js/scenes/gameover.js',
    'js/scenes/ending.js',
    'js/scenes/debug.js',

    'js/minigames/minigames.js',
    'js/minigames/motorcycle.js',
    'js/minigames/snowboard.js',
    'js/minigames/chocobo_race.js',
    'js/minigames/submarine.js',
    'js/minigames/misc_games.js',
    'js/minigames/fort_condor.js',
    'js/minigames/shooting.js',
    'js/minigames/action_games.js',
    'js/minigames/wonder_games.js',     // Wonder Square: arm wrestling, Wonder Catcher, 3-D Battler
    'js/minigames/mog_house.js',        // Wonder Square: Mog House, a visual novel
    // Kupomon, the MogBoy game by Cait Sith (docs/KUPOMON.md): data, robot moogle looks, the sandbox, battles, menus
    'js/kupomon/kp_data.js',
    'js/kupomon/kp_dex.js',             // the Kupodex, part one: jobs, moves and species of the first 68 families
    'js/kupomon/kp_dex2.js',            // the Kupodex part two: 52 more families (mostly FF spinoff jobs) and the full dex order
    'js/kupomon/kp_learnsets.js',       // level-up learnsets (KP.LEARN)
    'js/kupomon/kp_chips.js',           // Skill Chips, the TMs (KP.ITEMS kind chip, KP.CHIP_PLACES)
    'js/kupomon/kp_abilities.js',       // abilities (KP.ABILITIES, KP.SPECIES_ABIL)
    'js/kupomon/kp_models.js',
    'js/kupomon/kp_ui.js',
    'js/kupomon/kp_core.js',
    'js/kupomon/kp_stats.js',           // the expansion stats: Magic, Resistance, IVs, Appetites (Natures), level cap 50
    'js/kupomon/kp_calc.js',            // the Showdown battle maths: events, the damage formula, crits, accuracy, Speed
    'js/kupomon/kp_mech.js',            // the battle mechanics: statuses, field, sides, hazards, effect keys (docs/KUPOMON_MECHANICS.md)
    'js/kupomon/kp_fx.js',              // every move animated: FF7 battle effects chosen and tinted per move (KP.fxFor)
    'js/kupomon/kp_battle.js',
    'js/kupomon/kp_fieldfx.js',         // the field effects drawn in battle: weather, terrain, zones, side conditions, hazards
    'js/kupomon/kp_scrap.js',           // Scrap Metal from wild moogles, and the Shinra Recycler in the Mt. Kupo Caves
    'js/kupomon/kp_learn.js',           // learning moves (level-ups, Skill Chips) and abilities: the engine
    'js/kupomon/kp_tactics.js',         // the battle mind of the opponents that matter and of the Demo
    'js/kupomon/kp_content.js',         // the expansion content packs: KP.content (docs/KUPOMON_CONTENT.md)
    'js/kupomon/kp_menu.js',
    'js/kupomon/kp_repel.js',           // Pom Sprays (the Repels of Pokemon): wild moogles weaker than the lead keep away
    'js/kupomon/kp_traits.js',          // Kupo Capsules and Patches: changing a moogle ability, after the Kupo League
    'js/kupomon/kp_box.js',             // the Mog Box: a PC-style grid of moogle pictures
    'js/kupomon/kp_fly.js',             // the Big Mog bell: the Town Map and flying to a town (Pokemon Fly)
    'js/kupomon/kp_world.js',
    'js/kupomon/kp_breed.js',
    'js/kupomon/kp_trade.js',           // the MogNet Swap trade scene: the pad, the tubes, the two lights passing
    'js/kupomon/kp_league.js',
    'js/kupomon/kp_preview.js',         // team preview before every tournament battle: both teams shown, each side picks its lead
    // the expansion content packs (docs/KUPOMON_CONTENT.md): moves, abilities, held items, then the new lines, the
    // legends, breeding, and last the wild placement (tools/kp_place.js)
    'js/kupomon/content/kp_c00_moves_a.js',
    'js/kupomon/content/kp_c00_moves_b.js',
    'js/kupomon/content/kp_c01_abilities.js',
    'js/kupomon/content/kp_c02_items.js',
    'js/kupomon/content/kp_c03_tools.js',   // (the missing tools: Encore, Wish, Teleport, Memento, Perish Song, Rest and the rest; Skill Chips 60-71)
    'js/kupomon/content/kp_c10_era1.js',
    'js/kupomon/content/kp_c11_era2.js',
    'js/kupomon/content/kp_c12_era3.js',
    'js/kupomon/content/kp_c13_era4.js',
    'js/kupomon/content/kp_c14_era5.js',
    'js/kupomon/content/kp_c15_era6.js',
    'js/kupomon/content/kp_c16_era7.js',
    'js/kupomon/content/kp_c17_era8.js',
    'js/kupomon/content/kp_c18_era9.js',
    'js/kupomon/content/kp_c19_era10.js',
    'js/kupomon/content/kp_c20_legends.js',
    'js/kupomon/content/kp_c30_breed.js',
    'js/kupomon/content/kp_c40_trainers.js',
    'js/kupomon/content/kp_c41_trainers_quests.js',
    'js/kupomon/content/kp_c90_wild.js',
    'js/kupomon/content/kp_c95_wcsets.js',   // (the World Championship competitive sets: tools/kp_wcsets.js)
    'js/kupomon/content/kp_c96_wcteams.js',  // (the World Championship archetype opponents: tools/kp_archetypes.js)
    'js/kupomon/content/kp_c97_fill.js',     // (content gaps filled: eleven hidden abilities no moogle had)
    'js/kupomon/kp_legendbreed.js',          // (breeding a legend: its own item from its sidequest, and a fee for each plus)

    // the runner (Demo mode, tools/run_runner.js): engine, then one plan file per chapter (docs/RUNNER.md)
    'js/runner/mgbot.js',
    'js/runner/runner.js',
    'js/runner/menus.js',
    'js/runner/gear.js',
    'js/runner/chocobo.js',
    'js/runner/limits.js',
    'js/runner/demo.js',
    'js/ui/qol.js',                  // quality-of-life options (fast-forward, autosave, pause, hints)
    'js/runner/plans/plan_c1.js',
    'js/runner/plans/plan_c2.js',
    'js/runner/plans/plan_c3.js',
    'js/runner/plans/plan_c4.js',
    'js/runner/plans/plan_c5a.js',
    'js/runner/plans/plan_c5b.js',
    'js/runner/plans/plan_c6a.js',
    'js/runner/plans/plan_c6b.js',
    'js/runner/plans/plan_c7.js',
    'js/runner/plans/plan_c8.js',
    'js/runner/plans/plan_c9.js',
    'js/runner/plans/plan_c10.js',
    'js/runner/plans/plan_c11a.js',
    'js/runner/plans/plan_c12a.js',
    'js/runner/plans/plan_c12b.js',
    'js/runner/plans/plan_c11b.js',
    'js/kupomon/kp_runner.js',     // Kupomon in the runner (its screens, its ops) and its route
    'js/runner/plans/plan_kp.js',
  ];

  var DATA = [
    'js/data/audio_map.js',
    'js/data/characters.js',
    'js/data/items.js',
    'js/data/weapons.js',
    'js/data/armor.js',
    'js/data/accessories.js',
    'js/data/materia.js',
    'js/data/spells.js',
    'js/data/summons.js',
    'js/data/eskills.js',
    'js/data/limits.js',
    'js/data/enemies_d1a.js',
    'js/data/enemies_d1b.js',
    'js/data/enemies_d23.js',
    'js/data/enemy_manip.js',
    'js/data/encounters_d1a.js',
    'js/data/encounters_d1b.js',
    'js/data/encounters_d23.js',
    'js/data/shops.js',
    'js/data/world_map.js',
    'js/data/data_fixups.js',
  ];

  // Field maps + story, in story order.
  var MAPS = window.FF7_MAP_FILES || [];

  var BOOT = ['js/main.js'];

  var files = CORE.concat(DATA, MAPS, BOOT);
  var failed = [];
  // Avoid stale browser caches when served over http (dev); harmless on file://
  var BUST = location.protocol.indexOf('http') === 0 ? '?v=' + Date.now() : '';
  var bootEl = document.getElementById('boot');

  function finish() {
    if (failed.length) console.warn('Missing script files:', failed);
    if (bootEl) bootEl.style.display = 'none';
    if (FF7.boot) FF7.boot(); else if (bootEl) { bootEl.style.display = ''; bootEl.textContent = 'Boot failed (main.js missing)'; }
  }
  // Download every file in parallel but execute them in list order (async = false keeps the order
  // for dynamically added scripts); a missing file doesn't stop the others.
  function loadAll() {
    var left = files.length;
    function done() { left--; if (bootEl && left % 10 === 0) bootEl.textContent = 'Loading... ' + Math.round(100 * (files.length - left) / files.length) + '%'; if (left === 0) finish(); }
    files.forEach(function (f) {
      var s = document.createElement('script');
      s.src = f + BUST;
      s.async = false;
      s.onload = done;
      s.onerror = function () { failed.push(f); done(); };
      document.body.appendChild(s);
    });
  }

  // Map list lives in js/maps/_maps.js so content authors can append without touching this file.
  var m = document.createElement('script');
  m.src = 'js/maps/_maps.js' + BUST;
  m.onload = m.onerror = function () {
    MAPS = (window.FF7_MAP_FILES || []).map(function (f) { return 'js/maps/' + f; });
    files = CORE.concat(DATA, MAPS, BOOT);
    loadAll();
  };
  document.body.appendChild(m);
})();

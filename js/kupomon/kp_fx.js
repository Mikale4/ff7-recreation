// Kupomon move animation (the user's rule, 2026-10-02: every move animated). Each move plays a procedural effect from
// FF7's own battle effects (js/gfx/fx.js: its presets, and its blocks put together here in each job type's colours),
// chosen by KP.fxFor: the move's own fx key if it has one, else its name's words (Fire is fire, a Kick a punch, a song
// rings of sound), its effects (a heal, a wall, a weather, an ailment), then its type, category and power.
//   mv.fx: a preset name ('fire2', 'limit_braver', 'summon_shiva', 'kp_slash_warrior'...), or { name, self }
//   KP.fxFor(mv, id) -> { name, self, light }   (self: played on the user; light: a quick one for each extra hit)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const FX = FF7.fx; if (!FX || !FX.PRESETS) return;
  const P = FX.PRESETS;

  // each type's two effect colours (bright: the plain type colours are often too dull to glow)
  const COL = {
    freelancer: ['#e8e0c8', '#ffffff'], warrior: ['#ff5a40', '#ffd0a0'], knight: ['#a0c0ff', '#eef4ff'], monk: ['#ffb040', '#fff0a0'],
    thief: ['#b080ff', '#ece0ff'], dragoon: ['#4a8aff', '#c8e4ff'], ranger: ['#70e050', '#e4ffd8'], blackmage: ['#a060ff', '#f0d8ff'],
    whitemage: ['#fff0b0', '#ffffff'], redmage: ['#ff4070', '#ffd8e4'], summoner: ['#30e0c0', '#d4fff4'], timemage: ['#ffd030', '#fff8c8'],
    bard: ['#ff70d0', '#ffe4f8'], beast: ['#d0a850', '#fff0c8'], machinist: ['#ff9a40', '#e8eeff'], none: ['#ffffff', '#ffffff'],
  };
  KP.FX_COLORS = COL;
  // the families, each built for a colour pair: [preset props, blocks]
  const FAM = {
    slash: (a, b) => [{ sfx: 'hit', hit: 3 }, [['slash', { strokes: 'rand', width: 0.08, fadeT: 9, glow: a }], ['sparks', { n: 8, color: [b, '#ffffff'], size: 0.035, speed: 0.06, plife: 14 }]]],
    slash3: (a, b) => [{ sfx: 'hit', hit: 8, flash: b }, [['slash', { strokes: [[-0.8, 0.7, 0.8, -0.6], [0.8, 0.7, -0.8, -0.6], [-0.9, 0.05, 0.9, 0.05]], step: 3, width: 0.13, hold: 3, glow: a }], ['burst', { size: 1.2, color: b, n: 16, delay: 6 }], ['sparks', { n: 14, color: [a, b], size: 0.05, speed: 0.07, plife: 18, delay: 6 }]]],
    claw: (a, b) => [{ sfx: 'hit', hit: 3 }, [['slash', { strokes: [[-0.55, 0.55, 0.35, -0.45], [-0.4, 0.62, 0.5, -0.32], [-0.25, 0.7, 0.65, -0.2]], step: 1, width: 0.06, fadeT: 9, glow: a }], ['sparks', { n: 8, color: [b], size: 0.04, speed: 0.06, plife: 14 }]]],
    bite: (a, b) => [{ sfx: 'hit', hit: 4 }, [['slash', { strokes: [[-0.5, 0.6, 0.5, 0.45], [-0.5, -0.05, 0.5, 0.1]], step: 2, width: 0.09, fadeT: 8, glow: a }], ['burst', { size: 0.5, color: b, n: 8, delay: 3 }]]],
    punch: (a, b) => [{ sfx: 'hit', hit: 2 }, [['burst', { size: 0.6, color: b, n: 10 }], ['shock', { r: 0.7, color: a, life: 14 }]]],
    slam: (a, b) => [{ sfx: 'hit', hit: 4, shake: 4 }, [['burst', { size: 1.1, color: b, n: 16 }], ['shock', { r: 1.4, color: a, life: 20 }], ['dust', { n: 6, r: 0.8 }], ['sparks', { n: 12, color: [a, b], size: 0.05, speed: 0.07, up: 0.4, plife: 18 }]]],
    jump: (a, b) => [{ sfx: 'hit', hit: 5, shake: 6 }, [['column', { r: 0.3, h: 4, color: b, life: 14, alpha: 0.8 }], ['burst', { size: 1, color: b, n: 14, delay: 3 }], ['shock', { r: 1.5, color: a, life: 18, delay: 4 }], ['dust', { n: 8, r: 1, delay: 4 }]]],
    shot: (a, b) => [{ sfx: 'shot', hit: 4 }, [['beam', { r: 0.022, color: b, life: 10, travel: 3 }], ['burst', { size: 0.5, color: a, n: 8, delay: 3 }]]],
    volley: (a, b) => [{ sfx: 'shot', hit: 8 }, [['beam', { r: 0.02, color: b, life: 10, travel: 3 }], ['beam', { r: 0.02, color: b, life: 10, travel: 3, delay: 3 }], ['beam', { r: 0.02, color: b, life: 10, travel: 3, delay: 6 }], ['burst', { size: 0.8, color: a, n: 12, delay: 8 }]]],
    beam: (a, b) => [{ sfx: 'magic', hit: 8 }, [['beam', { r: 0.06, color: a, life: 20, travel: 5 }], ['burst', { size: 0.9, color: b, delay: 5 }]]],
    bigbeam: (a, b) => [{ sfx: 'magic', hit: 10, flash: b, shake: 5 }, [['beam', { r: 0.12, color: a, life: 26, travel: 6 }], ['burst', { size: 1.6, color: b, n: 20, delay: 6 }], ['shock', { r: 1.8, color: a, life: 22, delay: 7 }]]],
    orb: (a, b) => [{ sfx: 'magic', hit: 11 }, [['orb', { size: 0.3, color: a, travel: 10, arc: 0.15 }], ['burst', { size: 0.8, color: b, delay: 10 }], ['sparks', { n: 10, color: [a, b], size: 0.05, speed: 0.05, delay: 10, plife: 18 }]]],
    blast: (a, b) => [{ sfx: 'fire2', hit: 12, flash: b, shake: 5 }, [['glow', { size: 2.2, color: a, life: 30, grow: [0.3, 1.1], alpha: 0.85 }], ['column', { r: 0.6, h: 3, color: b, life: 26, alpha: 0.7 }], ['shock', { r: 1.6, color: b, life: 20, delay: 6 }], ['sparks', { n: 24, color: [a, b], size: 0.07, speed: 0.07, up: 0.5, plife: 26 }]]],
    wave: (a, b) => [{ sfx: 'magic', hit: 12 }, [['wave', { color: b, glow: a, travel: 12 }], ['burst', { size: 0.9, color: b, delay: 12 }]]],
    sound: (a, b) => [{ sfx: 'magic', hit: 10 }, [['rings', { n: 4, color: a, r: 0.7, life: 22, step: 4 }], ['sparks', { n: 10, color: [b, '#ffffff'], size: 0.06, speed: 0.05, plife: 20, delay: 4 }]]],
    dance: (a, b) => [{ sfx: 'magic', hit: 14 }, [['spiral', { color: a, life: 36 }], ['sparks', { mode: 'orbit', mesh: 'sparkle', n: 12, color: [b, '#ffffff'], size: 0.1, speed: 0.03, r: 0.6, plife: 28, dur: 12 }]]],
    wind: (a, b) => [{ sfx: 'magic', hit: 12 }, [['funnel', { r: 0.9, h: 2.2, color: b, alpha: 0.5, life: 36 }], ['sparks', { mode: 'orbit', n: 12, color: [b, '#ffffff'], size: 0.05, speed: 0.05, r: 0.7, plife: 28, dur: 14 }]]],
    powder: (a, b) => [{ sfx: 'magic', hit: 12 }, [['cloud', { n: 6, r: 0.4, size: 0.6, color: [a, b], life: 34, alpha: 0.5, y: 0.8 }], ['sparks', { mode: 'fall', n: 12, color: [b], size: 0.05, speed: 0.03, r: 0.5, plife: 26, dur: 10 }]]],
    time: (a, b) => [{ sfx: 'magic', hit: 14 }, [['clock', { color: b, life: 30, speed: 0.8 }], ['rings', { n: 2, color: a, r: 0.6, life: 22, step: 6 }]]],
    spirit: (a, b) => [{ sfx: 'magic', hit: 14 }, [['sparks', { mode: 'in', n: 16, color: [a, '#103030'], size: 0.1, r: 1.2, plife: 16, dur: 10, blend: 'alpha' }], ['glow', { size: 1.5, color: a, life: 28, alpha: 0.7, delay: 8 }], ['burst', { size: 0.9, color: b, delay: 12 }]]],
    aura: (a, b) => [{ sfx: 'magic', hit: 12, heal: true }, [['rings', { n: 3, color: a, r: 0.55, life: 22, step: 4 }], ['sparks', { mode: 'rise', n: 12, color: [b, a], size: 0.06, speed: 0.07, r: 0.4, plife: 20, dur: 10 }], ['glow', { size: 1.1, color: a, life: 24, alpha: 0.4 }]]],
    hex: (a, b) => [{ sfx: 'magic', hit: 12 }, [['rings', { n: 3, dir: -1, color: a, r: 0.6, life: 22, step: 4 }], ['sparks', { mode: 'fall', n: 12, color: [a, '#402060'], size: 0.06, speed: 0.05, r: 0.5, top: 1.5, plife: 24, dur: 10 }], ['glow', { size: 1.1, color: a, life: 26, alpha: 0.35 }]]],
    hazard: (a, b) => [{ sfx: 'cast', hit: 10 }, [['shards', { n: 12, color: [a, b], at: 'ground', up: 0.2 }], ['dust', { n: 6, r: 0.9 }]]],
    field: (a, b) => [{ sfx: 'magic', hit: 16 }, [['flashGround', { r: 1.6, color: a, life: 22, alpha: 0.7 }], ['rings', { n: 3, color: a, r: 1.2, life: 26, step: 5, at: 'ground' }], ['sparks', { mode: 'rise', n: 16, color: [a, b], size: 0.05, speed: 0.05, r: 1.2, plife: 26, dur: 14 }]]],
    sky: (a, b) => [{ sfx: 'magic', hit: 16 }, [['cloud', { n: 8, r: 1.2, size: 1, color: [a, b], life: 40, alpha: 0.45, y: 2.2 }], ['sparks', { mode: 'fall', n: 20, color: [b, a], size: 0.05, speed: 0.05, r: 1.4, top: 2.4, plife: 30, dur: 16 }]]],
  };
  const FAMS = Object.keys(FAM);
  for (const t of Object.keys(COL)) for (const fam of FAMS) {
    const [a, b] = COL[t], [props, blocks] = FAM[fam](a, b);
    P[`kp_${fam}_${t}`] = Object.assign({ color: a }, props, { fx: blocks });
  }

  // a move's words: the first family that matches wins (FF7 presets by name; kp_<family>_<type> otherwise)
  const tier = (mv, a, b, c) => { const p = mv.power || 0; return p >= 100 ? c : p >= 65 ? b : a; };
  const WORDS = [
    [/ultima/, () => 'ultima'],
    [/meteor|comet|starfall|astral/, () => 'comet'],
    [/flare|nova|megaflare|big bang/, () => 'flare'],
    [/holy|banish|\bdia\b|judg|divine|sacred|angel|heaven|smite|seraph|halo/, (mv) => (mv.power || 0) >= 90 ? 'holy' : null],
    [/fir[ae]|flam|blaz|burn|ember|heat|magma|lava|scorch|pyre|ifrit|phoenix|inferno|cinder/, (mv) => tier(mv, 'fire1', 'fire2', 'fire3')],
    [/\bice|bliz|frost|freez|snow|chill|glaci|shiva|hail|cryo/, (mv) => tier(mv, 'ice1', 'ice2', 'ice3')],
    [/thund|volt|spark|shock|lightn|ramuh|zap|static|electr|tesla|storm/, (mv) => tier(mv, 'bolt1', 'bolt2', 'bolt3')],
    [/quake|earth|gaia|terra|titan|tremor|seism|landslide|fissure|\bsand|\bmud\b/, (mv) => tier(mv, 'quake1', 'quake2', 'quake3')],
    [/\bbio\b|bio_|poison|toxic|venom|sludge|acid|plague|miasma/, (mv) => tier(mv, 'bio1', 'bio2', 'bio3')],
    [/water|aqua|tide|torrent|flood|bubble|hydro|leviathan|splash|geyser|tsunami|\brain\b|drizzle|\bsurf/, (mv) => (mv.power || 0) >= 60 ? 'aqualung' : null],
    [/tornado|cyclone|typhoon|maelstrom/, () => 'tornado'],
    [/osmose|mana drain|syphon/, () => 'osmose'],
    [/drain|blood|leech|vampir|siphon|lancet|absorb/, () => 'drain'],
    [/explo|bomb|boom|grenade|detonat|dynamite|selfdestruct|self-destruct/, () => 'explosion'],
    [/laser|\bray\b|beam|cannon|pulse/, (mv, t) => (mv.power || 0) >= 100 ? `kp_bigbeam_${t}` : `kp_beam_${t}`],
    [/gravit|grav\b|graviga|demi|crush|weight/, () => 'demi'],
    [/dark|shadow|night|void|abyss|doom|death|necro|hades/, (mv) => (mv.power || 0) >= 90 ? 'shadow_flare' : null],
    [/song|chord|hymn|requiem|ballad|melod|serenad|chorus|aria|\bsing|note|lullab|anthem|fanfare|voice|roar|howl|\bcry\b|shout|yell|scream|screech|harmon|sonic|echo|choir|verse/, (mv, t) => `kp_sound_${t}`],
    [/jump|dive|leap|plunge|drop|pounce|highwind|lunar/, (mv, t) => `kp_jump_${t}`],
    [/punch|fist|knuckle|jab|kick|pummel|uppercut|chop|palm|elbow|knee|headbutt|tackle|slam|bash|\bram\b|charge|rush|stomp|smash|hammer|crash/, (mv, t) => (mv.power || 0) >= 90 ? `kp_slam_${t}` : `kp_punch_${t}`],
    [/fang|bite|chomp|jaw|gnaw|nibble/, (mv, t) => `kp_bite_${t}`],
    [/claw|talon|scratch|rake|swipe|maul|\brip\b/, (mv, t) => `kp_claw_${t}`],
    [/arrow|shot|shoot|\bgun|bullet|rifle|snipe|musket|pistol|crossbow|dart|needle|missile|rivet/, (mv, t) => mv.hits ? `kp_volley_${t}` : `kp_shot_${t}`],
    [/barrage|volley|rain of|salvo/, (mv, t) => `kp_volley_${t}`],
    [/slash|blade|sword|\bcut|cleave|edge|saber|katana|iai|zantetsu|slice|sever|rend|carve|lance|spear|thrust|pierce|stab|dagger|shuriken|kunai|strike|axe|scythe|reap|\bsaw\b|chainsaw/, (mv, t) => (mv.power || 0) >= 100 ? `kp_slash3_${t}` : `kp_slash_${t}`],
    [/danc|waltz|tango|jig|samba|ballet|twirl|pirouette|spin|whirl|polka|step/, (mv, t) => `kp_dance_${t}`],
    [/wind|aero|gust|gale|zephyr|breeze|tailwind|\bwing|feather/, (mv, t) => `kp_wind_${t}`],
    [/spore|powder|\bdust|pollen|smoke|\bmist|\bfog|\bash\b/, (mv, t) => `kp_powder_${t}`],
    [/\btime\b|clock|chrono|\btick|\bhour|tempo|second hand/, (mv, t) => `kp_time_${t}`],
    [/spirit|ghost|phantom|haunt|soul|spook|ecto|wraith|summon|evoke|call/, (mv, t) => `kp_spirit_${t}`],
    [/wave|ripple|tremor|shock wave/, (mv, t) => `kp_wave_${t}`],
  ];
  const STATUS_FX = { sleep: 'sleep', confuse: 'confuse', berserk: 'berserk', mini: 'mini', zombie: 'toad', doom: 'death', poison: 'bio1', venom: 'bio2', stop: 'stop', slow: 'stop', burn: 'fire1', blind: 'debuff', silence: 'debuff' };
  const SIDE_FX = { wall: 'barrier', shell: 'mbarrier', veil: 'reflect', safeguard: 'barrier', mist: 'white_wind' };
  const WEATHER_FX = { radiance: 'holy', gloom: 'shadow_flare', sandstorm: 'tornado', manastorm: 'flare' };
  const ROOM_FX = { timewarp: 'stop', gravity: 'demi', nullzone: 'break', wonderzone: 'trine' };
  const SIZE = { slash: 1.5, slash3: 1.4, claw: 1.5, bite: 1.4, punch: 1.3, slam: 1.2, shot: 1.3, volley: 1.3, beam: 1.1, orb: 1.2, sound: 1.2, dance: 1.1, time: 1.3, spirit: 1.2, aura: 1.2, hex: 1.2, wave: 1.2 };
  const BIG_FX = new Set(['fire2', 'fire3', 'ice2', 'ice3', 'bolt2', 'bolt3', 'quake1', 'quake2', 'quake3', 'bio3', 'holy', 'flare', 'ultima', 'comet', 'tornado', 'shadow_flare', 'explosion', 'aqualung', 'demi']);
  const has = (n) => !!P[n];
  const cache = new Map();
  KP.fxFor = function (mv, id) {
    if (!mv) return null;
    const key = id || mv.name;
    if (cache.has(key) && cache.get(key).mv === mv) return cache.get(key).fx;
    const t = COL[mv.type] ? mv.type : 'none', cat = KP.category(mv);
    let out = null;
    if (mv.fx) out = typeof mv.fx === 'string' ? { name: mv.fx } : Object.assign({}, mv.fx);
    else if (cat === 'status') {
      const self = !!(mv.self || mv.heal || mv.guard || mv.endure || mv.side || mv.weather || mv.terrain || mv.room || (mv.stat && mv.stat[2] === 'self') || (mv.vol && Object.keys(mv.vol).some(k => KP.VOLATILES[k] && !KP.VOLATILES[k].foe)) || mv.cureTeam || mv.haze || (mv.selfSwitch && !mv.foe));
      const vol = mv.vol || {};
      const name = mv.heal ? 'cure' : mv.cureTeam ? 'esuna' : mv.guard ? 'barrier' : mv.endure ? 'buff' : mv.side ? (SIDE_FX[mv.side] || `kp_wind_${t}`)
        : mv.weather ? WEATHER_FX[mv.weather] : mv.terrain ? `kp_field_${t}` : mv.room ? ROOM_FX[mv.room] : mv.hazard ? (mv.hazard === 'venom_spikes' ? 'bio1' : `kp_hazard_${t}`)
        : mv.haze ? 'white_wind' : mv.status ? (STATUS_FX[Array.isArray(mv.status[0]) ? mv.status[0][0] : mv.status[0]] || `kp_hex_${t}`)
        : vol.leech ? 'drain' : vol.curse || vol.destiny ? 'death' : vol.yawn ? 'sleep' : vol.reflect ? 'reflect' : vol.regen ? 'cure' : vol.focus || vol.lockOn ? 'charge' : vol.taunt ? 'berserk' : vol.suppressed ? 'break'
        : mv.forceSwitch ? 'tornado' : mv.trick ? 'trine' : mv.invertFoe ? 'trine' : self ? `kp_aura_${t}` : `kp_hex_${t}`;
      out = { name, self: self && !mv.hazard };
    } else {
      const words = ((id || '') + ' ' + (mv.name || '')).toLowerCase().replace(/_/g, ' ');
      for (const [re, fn] of WORDS) { if (!re.test(words)) continue; const n = fn(mv, t); if (n) { out = { name: n }; break; } }
      if (!out) {   // by type and category
        const big = (mv.power || 0) >= 100, phys = cat === 'physical', contact = KP.hasFlag && KP.hasFlag(mv, 'contact');
        const byType = {
          freelancer: phys ? (big ? 'slam' : 'punch') : 'orb', warrior: big ? 'slash3' : 'slash', knight: phys ? (big ? 'slash3' : 'slash') : 'beam', monk: phys ? (big ? 'slam' : 'punch') : 'orb',
          thief: phys ? 'slash' : 'orb', dragoon: phys ? (big ? 'jump' : 'slash') : 'beam', ranger: phys ? 'shot' : 'beam', blackmage: big ? 'blast' : 'orb', whitemage: big ? 'blast' : 'orb',
          redmage: phys ? 'slash' : big ? 'blast' : 'orb', summoner: big ? 'blast' : 'spirit', timemage: big ? 'blast' : 'time', bard: 'sound', beast: phys ? (contact ? 'claw' : 'slam') : 'wave', machinist: phys ? (contact ? 'slam' : 'shot') : 'beam', none: 'punch',
        };
        out = { name: `kp_${byType[t] || 'punch'}_${t}` };
      }
      if (mv.drain && !/drain|osmose/.test(out.name)) out.after = 'drain';
    }
    if (!has(out.name)) out.name = cat === 'status' ? `kp_aura_${t}` : `kp_punch_${t}`;
    // a quick one for each extra hit of a multi-hit move; and its size on the moogles' stage (a thin slash a little
    // bigger, the FF7 status effects too: kp_battle.js FX_SCALE is the base)
    const fam = (out.name.match(/^kp_([a-z0-9]+)_/) || [])[1];
    if (out.scale == null) out.scale = fam ? (SIZE[fam] || 1) : (BIG_FX.has(out.name) ? 1 : 1.3);
    out.light = fam && ['slash', 'slash3', 'claw', 'bite'].includes(fam) ? `kp_slash_${t}` : fam === 'shot' || fam === 'volley' ? `kp_shot_${t}` : `kp_punch_${t}`;
    cache.set(key, { mv, fx: out });
    return out;
  };
})();

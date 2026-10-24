// Achievements (not in the PS1 game; the user asked for them): milestones of the story, the party, battles, the side
// content, Cait Sith's workshop and Kupomon. They belong to the player, not to a save file (localStorage
// 'ff7js_achievements'), so any file can earn them. Checked about once a second in real play only: test games
// (FF7.devState) and the Demo (the runner) never earn them. A toast slides in when one unlocks; the title screen's
// Achievements lists them (secret ones stay hidden until earned).
//   FF7.achievements.LIST · .has(id) · .unlock(id) · .tick() (js/main.js FF7.stepFrame) · .open()
(function () {
  const A = FF7.achievements = {};
  const R = () => FF7.render, KEY = 'ff7js_achievements';
  const real = () => (FF7.kupomon && FF7.kupomon.real ? FF7.kupomon.real.state : FF7.state);   // (inside Kupomon: the FF7 game around it)
  const flag = (f) => (st) => !!(st.flags && st.flags[f]);
  const seen = (m) => (st) => !!(st.mapsSeen && st.mapsSeen[m]);
  const chars = (st) => Object.values(st.chars || {}).filter(Boolean);
  const materia = (st, id) => (st.materia || []).filter(m => m && m.id === id).length + chars(st).reduce((n, c) => n + (c.weaponMateria || []).concat(c.armorMateria || []).filter(m => m && m.id === id).length, 0);
  // Kupomon: the furthest saved file, or the game being played right now
  const kp = () => {
    const K = FF7.kupomon; if (!K || !K.progressOf) return { badges: [], trophies: [], dex: 0, caught: 0 };
    const p = K.progressOf(real());
    const live = FF7.state && FF7.state.kupomon && FF7.state.kp;
    if (live) {
      const b = live.badges || [], t = live.trophies || [], dex = Object.keys((live.dex && live.dex.caught) || {}).length;
      return { badges: b.length > p.badges.length ? b : p.badges, trophies: t.length > p.trophies.length ? t : p.trophies, dex: Math.max(p.dex, dex), diploma: p.diploma || !!(FF7.state.flags && FF7.state.flags.kp_diploma), champion: p.champion || !!(FF7.state.flags && FF7.state.flags.kp_champion) };
    }
    return p;
  };
  const carts = (st) => ((st.vars && st.vars.mogboy_carts) || 0);

  // cat: story party battle weapons side cait kupomon (the colour of its cup)
  A.LIST = [
    { id: 'sector7', cat: 'story', name: 'Next Stop: Sector 7', desc: 'Ride the train into the Sector 7 slums.', check: seen('s7_station') },
    { id: 'church', cat: 'story', name: 'Heaven-Sent', desc: 'Fall through a church roof and land in a flower bed.', check: seen('s5_church') },
    { id: 'midgar', cat: 'story', name: 'Beyond the Plate', desc: 'Escape from Midgar.', check: flag('left_midgar') },
    { id: 'phs', cat: 'story', name: 'Party Line', desc: 'Receive the PHS in Kalm.', check: flag('has_phs') },
    { id: 'costa', cat: 'story', name: 'Sun, Sand and Stowaways', desc: 'Reach Costa del Sol.', check: seen('costa_port') },
    { id: 'saucer', cat: 'story', name: 'Gold Saucer Debut', desc: 'Ride the ropeway up to the Gold Saucer.', check: seen('gs_station') },
    { id: 'buggy', cat: 'story', name: 'Off-Road', desc: 'Get the buggy.', check: flag('has_buggy') },
    { id: 'bronco', cat: 'story', name: 'Tiny but Mighty', desc: 'Take the Tiny Bronco out to sea.', check: flag('has_bronco') },
    { id: 'keystone', cat: 'story', name: 'Keystone', desc: 'Win the Keystone from Dio.', check: flag('keystone') },
    { id: 'disc1', cat: 'story', name: 'End of Disc 1', desc: 'See the end of Disc 1.', secret: true, check: flag('disc2') },
    { id: 'highwind', cat: 'story', name: 'Captain of the Skies', desc: 'Take the helm of the Highwind.', check: flag('has_highwind') },
    { id: 'return', cat: 'story', name: 'The Real Me', desc: 'Bring Cloud back to the party.', secret: true, check: flag('cloud_returned') },
    { id: 'huge', cat: 'story', name: 'Huge Materia', desc: 'Settle the fate of every Huge Materia.', check: flag('huge_materia_done') },
    { id: 'disc2', cat: 'story', name: 'End of Disc 2', desc: 'See the end of Disc 2.', secret: true, check: flag('disc3') },
    { id: 'clear', cat: 'story', name: 'The Planet Breathes', desc: 'Beat the game.', secret: true, check: flag('game_cleared') },

    { id: 'redxiii', cat: 'party', name: 'Lab Partner', desc: 'Red XIII joins the party.', check: flag('redxiii_joined') },
    { id: 'caitsith', cat: 'party', name: 'Fortune Favors', desc: 'Cait Sith joins the party.', check: flag('cait_joined') },
    { id: 'cid', cat: 'party', name: 'Space Cadet', desc: 'Cid joins the party.', check: flag('cid_joined') },
    { id: 'yuffie', cat: 'party', name: 'Materia Hunter', desc: 'Recruit Yuffie.', check: flag('yuffie_joined') },
    { id: 'vincent', cat: 'party', name: 'Wake the Sleeper', desc: 'Recruit Vincent.', check: flag('vincent_joined') },
    { id: 'turks', cat: 'party', name: 'Off the Clock', desc: 'The Turks join you (Turks Join).', check: flag('tk_joined') },

    { id: 'lv50', cat: 'battle', name: 'Halfway There', desc: 'Raise anyone to level 50.', check: (st) => chars(st).some(c => c.level >= 50) },
    { id: 'lv99', cat: 'battle', name: 'Level 99', desc: 'Raise anyone to level 99.', check: (st) => chars(st).some(c => c.level >= 99) },
    { id: 'battles', cat: 'battle', name: 'Battle-Hardened', desc: 'Fight 500 battles.', check: (st) => (st.battles || 0) >= 500 },
    { id: 'kills', cat: 'battle', name: 'A Thousand Foes', desc: 'Defeat 1,000 enemies between you.', check: (st) => chars(st).reduce((n, c) => n + (c.kills || 0), 0) >= 1000 },
    { id: 'gil', cat: 'battle', name: 'Millionaire', desc: 'Hold 1,000,000 gil.', check: (st) => (st.gil || 0) >= 1000000 },
    { id: 'omnislash', cat: 'battle', name: 'Omnislash', desc: "Learn Cloud's final Limit Break.", check: (st) => !!(st.chars && st.chars.cloud && (st.chars.cloud.limitsKnown || []).includes('omnislash')) },
    { id: 'kotr', cat: 'battle', name: 'Round Table', desc: 'Own the Knights of the Round.', check: (st) => materia(st, 'knights_of_round') > 0 },
    { id: 'master', cat: 'battle', name: 'Master of Materia', desc: 'Own a Master Magic, Command or Summon materia.', check: (st) => ['master_magic', 'master_command', 'master_summon'].some(id => materia(st, id) > 0) },

    { id: 'ultimate', cat: 'weapons', name: 'Ultimate Showdown', desc: 'Defeat the Ultimate WEAPON.', check: flag('c12b_ultimate_dead') },
    { id: 'emerald', cat: 'weapons', name: 'Deep Water', desc: 'Defeat the Emerald WEAPON.', check: flag('c12b_emerald_dead') },
    { id: 'ruby', cat: 'weapons', name: 'Sandstorm', desc: 'Defeat the Ruby WEAPON.', check: flag('c12b_ruby_dead') },

    { id: 'arena', cat: 'side', name: 'Battle Square Champion', desc: 'Clear the Battle Square.', check: flag('c12a_arena_clear') },
    { id: 'special', cat: 'side', name: 'Special Battle', desc: "Clear the Battle Square's Special Battle.", check: flag('c12a_special_clear') },
    { id: 'goldchoco', cat: 'side', name: 'Golden Wings', desc: 'Own a Gold Chocobo.', check: (st) => flag('c12a_gold_delivered')(st) || Object.keys(st.flags || {}).some(f => /^c12a_bred_gold/.test(f) && st.flags[f]) },

    { id: 'hideout', cat: 'cait', name: 'Behind the Booth', desc: "Find Cait Sith's hidden workshop.", check: flag('cait_hideout_found') },
    { id: 'parts', cat: 'cait', name: 'Some Assembly Required', desc: "Fix Cait Sith's fortune machine.", check: flag('cait_quest_done') },
    { id: 'mogboy', cat: 'cait', name: 'Portable Fun', desc: 'Get the MogBoy.', check: (st) => (st.keyItems || []).includes('mogboy') },
    { id: 'carts', cat: 'cait', name: 'Full Library', desc: 'Own every MogBoy cartridge.', check: (st) => (carts(st) & 127) === 127 },

    { id: 'kupomon', cat: 'kupomon', name: 'Kupo!', desc: "Become Cait Sith's Kupomon beta tester.", check: (st) => !!(carts(st) & 64) },
    { id: 'kp_friend', cat: 'kupomon', name: 'Nuts About You', desc: 'Befriend a wild moogle in Kupomon.', check: () => kp().dex >= 2 },
    { id: 'kp_badge', cat: 'kupomon', name: 'First Badge', desc: 'Win a Kupomon dojo badge.', check: () => kp().badges.length >= 1 },
    { id: 'kp_badges', cat: 'kupomon', name: 'Six for Six', desc: 'Win six Kupomon dojo badges.', check: () => kp().badges.length >= 6 },
    { id: 'kp_badges8', cat: 'kupomon', name: 'Eight for Eight', desc: 'Win all eight Kupomon dojo badges.', check: () => kp().badges.length >= 8 },
    { id: 'kp_champion', cat: 'kupomon', name: 'Kupo League Champion', desc: 'Beat the Elite Four and the Champion of the Kupo League.', check: () => kp().champion },
    { id: 'kp_gold', cat: 'kupomon', name: 'Gold Medalist', desc: 'Win the Gold League.', check: () => kp().trophies.includes(1) },
    { id: 'kp_world', cat: 'kupomon', name: 'World Champion', desc: 'Win the Kupomon World Championship.', secret: true, check: () => kp().trophies.includes(5) },
    { id: 'kp_dex', cat: 'kupomon', name: 'Kupodex Complete', desc: "Befriend every kind of moogle in Kupomon and earn Prof. Sith's diploma.", secret: true, check: () => kp().diploma },
    { id: 'kp_dex', cat: 'kupomon', name: 'Gotta Befriend Them All', desc: 'Complete the Kupodex.', check: () => kp().dex >= ((FF7.kupomon && FF7.kupomon.DEX) || []).length && kp().dex > 100 },
  ];
  A.CAT = { story: '#e8c040', party: '#60c0e0', battle: '#e06060', weapons: '#a070e0', side: '#60d080', cait: '#c890ff', kupomon: '#ff7aa0' };

  // ------------------------------------------------------------------ the record
  let got = null;
  const load = () => { if (got) return got; try { got = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { got = {}; } return got; };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) { } };
  A.has = (id) => !!load()[id];
  A.count = () => A.LIST.filter(a => A.has(a.id)).length;
  A.unlock = function (id) {
    if (A.has(id)) return false;
    const a = A.LIST.find(x => x.id === id); if (!a) return false;
    load()[id] = Date.now(); store();
    A.toast(a);
    return true;
  };
  // about once a second, in real play
  let n = 0;
  A.tick = function () {
    if (++n % 60) return;
    const st = real();
    if (!st || st === FF7.devState || (FF7.runner && FF7.runner.active)) return;
    const top = FF7.sceneMgr.top(); if (!top || top.isTitle) return;
    for (const a of A.LIST) { if (A.has(a.id)) continue; let ok = false; try { ok = a.check(st); } catch (e) { } if (ok) A.unlock(a.id); }
  };

  // ------------------------------------------------------------------ the toast: slides in at the top right
  const cup = (c, cx, cy, s, col) => {
    const g = c.createLinearGradient(cx - s, 0, cx + s, 0); g.addColorStop(0, FF7.util.shade(col, -0.35)); g.addColorStop(0.45, FF7.util.shade(col, 0.4)); g.addColorStop(1, FF7.util.shade(col, -0.4));
    c.save(); c.fillStyle = g; c.strokeStyle = FF7.util.shade(col, -0.6); c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx - s * 0.7, cy - s); c.lineTo(cx + s * 0.7, cy - s); c.quadraticCurveTo(cx + s * 0.65, cy, cx, cy + s * 0.15); c.quadraticCurveTo(cx - s * 0.65, cy, cx - s * 0.7, cy - s); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = s * 0.14; c.strokeStyle = g; [1, -1].forEach(d => { c.beginPath(); c.arc(cx + d * s * 0.72, cy - s * 0.6, s * 0.26, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); c.stroke(); });
    c.fillRect(cx - s * 0.1, cy + s * 0.1, s * 0.2, s * 0.45); c.fillRect(cx - s * 0.45, cy + s * 0.52, s * 0.9, s * 0.18);
    c.restore();
  };
  A.cup = cup;
  const queue = [];
  A.toast = function (a) {
    queue.push(a);
    if (queue.length > 1) return;
    try { FF7.audio.sfx('levelup'); } catch (e) { }
    FF7.sceneMgr.addWidget({ modal: false, persistent: true, aboveFade: true, done: false, t: 0,
      update() { this.t++; if (this.t > 240) { queue.shift(); this.t = 0; if (!queue.length) this.done = true; else try { FF7.audio.sfx('levelup'); } catch (e) { } } },
      render() {
        const a = queue[0]; if (!a) return;
        const r = R(), c = r.ctx, W = FF7.W, w = 250, h = 54, k = Math.min(1, this.t / 18, (240 - this.t) / 18), x = W - (w + 10) * k, y = 10;
        c.save(); c.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
        r.window(x, y, w, h);
        cup(c, x + 28, y + 30, 13, A.CAT[a.cat] || '#e8c040');
        r.text('ACHIEVEMENT UNLOCKED', x + 52, y + 9, { size: 10, color: A.CAT[a.cat] || '#e8c040', weight: '800' });
        r.textFit(a.name, x + 52, y + 24, w - 62, { size: 15, minSize: 11 });
        c.restore();
      } });
  };

  // ------------------------------------------------------------------ the list (the title screen's Achievements)
  class Screen {
    constructor() { this.idx = 0; this.t = 0; this.isTitle = true; this.noClock = true; }
    update() {
      const I = FF7.input, n = A.LIST.length; this.t++;
      if (I.repeat('up')) { this.idx = (this.idx + n - 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % n; FF7.audio.sfx('cursor'); }
      if (I.repeat('left')) { this.idx = Math.max(0, this.idx - 6); FF7.audio.sfx('cursor'); }
      if (I.repeat('right')) { this.idx = Math.min(n - 1, this.idx + 6); FF7.audio.sfx('cursor'); }
      if (I.back() || I.pressed('menu')) { FF7.audio.sfx('cancel'); FF7.sceneMgr.pop(); }
    }
    render() {
      const r = R(), c = r.ctx, W = FF7.W, H = FF7.H, L = A.LIST, rows = 7, rh = 54;
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      r.window(16, 12, W - 32, 44);
      r.text('ACHIEVEMENTS', 32, 24, { size: 18, color: r.COL.cyan, weight: '800' });
      r.text(`${A.count()} / ${L.length}`, W - 32, 26, { size: 16, align: 'right' });
      const top = Math.max(0, Math.min(this.idx - 3, L.length - rows));
      r.window(16, 60, W - 32, rows * rh + 12);
      for (let i = top; i < Math.min(L.length, top + rows); i++) {
        const a = L[i], y = 68 + (i - top) * rh, have = A.has(a.id), hide = a.secret && !have;
        if (i === this.idx) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(24, y, W - 48, rh - 4); }
        cup(c, 52, y + 28, 14, have ? (A.CAT[a.cat] || '#e8c040') : '#4a4e5a');
        r.text(hide ? '???' : a.name, 82, y + 6, { size: 16, color: have ? r.COL.white : r.COL.gray });
        r.textFit(hide ? 'A secret achievement.' : a.desc, 82, y + 28, W - 230, { size: 12, minSize: 10, color: r.COL.gray });
        if (have) { const d = new Date(load()[a.id]); r.text(d.toLocaleDateString ? d.toLocaleDateString() : '', W - 36, y + 8, { size: 11, align: 'right', color: '#9aa4c0' }); }
      }
      r.cursor(30, 79 + (this.idx - top) * rh);
    }
  }
  A.open = () => FF7.sceneMgr.push(new Screen());
  A.Screen = Screen;
})();

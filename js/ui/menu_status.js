// Status screen (3 pages like FF7: stats, element/status attack & defence, commands/abilities).
(function () {
  const U = FF7.util, R = FF7.render, I = FF7.input, UI = FF7.ui, D = FF7.data;
  const ELEMS = ['fire', 'ice', 'lightning', 'earth', 'poison', 'gravity', 'water', 'wind', 'holy'];
  const STATS = ['poison', 'sleep', 'silence', 'confusion', 'berserk', 'frog', 'small', 'slow_numb', 'petrify', 'death', 'darkness', 'paralysis', 'stop', 'slow', 'death_sentence', 'manipulate'];

  class StatusPanel extends UI.Panel {
    constructor(m, c) { super(m); this.c = c; this.page = 0; }
    update() {
      if (I.pressed('ok') || I.pressed('right')) { this.page = (this.page + 1) % 3; FF7.audio.sfx('cursor'); }
      if (I.pressed('left')) { this.page = (this.page + 2) % 3; FF7.audio.sfx('cursor'); }
      if (I.pressed('l1') || I.pressed('r1') || I.repeat('up') || I.repeat('down')) { const p = this.menu.party(); const i = p.indexOf(this.c); const d = (I.pressed('l1') || I.repeat('up')) ? -1 : 1; this.c = p[(i + d + p.length) % p.length]; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); this.close(); }
    }
    render() {
      const c = this.c;
      R.window(0, 0, FF7.W, FF7.H);
      UI.drawCharBlock(c, 20, 18);
      R.text('EXP', 300, 22, { size: 14, color: R.COL.cyan }); R.text(U.fmtNum(c.xp) + 'p', 520, 22, { align: 'right', size: 16 });
      R.text('Next level', 300, 46, { size: 14, color: R.COL.cyan }); R.text(U.fmtNum(FF7.sys.stats.xpToNext(c)) + 'p', 520, 46, { align: 'right', size: 16 });
      R.text('Limit level', 300, 70, { size: 14, color: R.COL.cyan }); R.text(String(c.limitLevel), 520, 70, { align: 'right', size: 16 });
      R.text(`Status (${this.page + 1}/3)`, 620, 110, { align: 'right', size: 13, color: R.COL.gray });
      const d = c.d;
      if (this.page === 0) {
        const L = [['Strength', d.str], ['Dexterity', d.dex], ['Vitality', d.vit], ['Magic', d.mag], ['Spirit', d.spr], ['Luck', d.lck]];
        L.forEach(([k, v], i) => { R.text(k, 40, 140 + i * 28, { size: 16, color: R.COL.cyan }); R.text(String(v), 240, 140 + i * 28, { align: 'right' }); });
        const L2 = [['Attack', d.atk], ['Attack%', d.hit], ['Defense', d.def], ['Defense%', d.defPct], ['Magic atk', d.mat], ['Magic def', d.mdf], ['Magic def%', d.mdfPct]];
        L2.forEach(([k, v], i) => { R.text(k, 40, 318 + i * 22, { size: 14, color: R.COL.cyan }); R.text(String(v), 240, 318 + i * 22, { align: 'right', size: 15 }); });
        [['Wpn.', c.weapon, 140], ['Arm.', c.armor, 206], ['Acc.', c.accessory, 272]].forEach(([lab, id, y]) => {
          R.text(lab, 300, y, { size: 15, color: R.COL.cyan });
          if (id) { UI.itemIcon(R.ctx, 360, y + 1, UI.iconKind(id)); R.text(U.itemName(id), 380, y); }
        });
        UI.drawSlots(370, 178, c.weaponMateria, (FF7.sys.stats.weapon(c) || {}).links || 0, -1);
        UI.drawSlots(370, 244, c.armorMateria, (FF7.sys.stats.armor(c) || {}).links || 0, -1);
      } else if (this.page === 1) {
        const ed = FF7.sys.stats.elemDefense(c);
        R.text('Element defense', 40, 140, { color: R.COL.cyan });
        ELEMS.forEach((e, i) => { R.text(e, 60 + (i % 3) * 180, 170 + Math.floor(i / 3) * 26, { size: 15, color: ed[e] ? R.COL.white : R.COL.gray }); if (ed[e]) R.text(ed[e], 150 + (i % 3) * 180, 170 + Math.floor(i / 3) * 26, { size: 12, color: R.COL.yellow }); });
        const sd = FF7.sys.stats.statusDefense(c);
        R.text('Status defense', 40, 260, { color: R.COL.cyan });
        STATS.forEach((s, i) => R.text(s.replace('_', '-'), 60 + (i % 4) * 140, 290 + Math.floor(i / 4) * 26, { size: 14, color: sd.has(s) ? R.COL.white : R.COL.gray }));
      } else {
        const ab = FF7.sys.materia.abilities(c);
        R.text('Command', 40, 140, { color: R.COL.cyan });
        ab.commands.forEach((cmd, i) => R.text(FF7.battle.CMD_NAMES[cmd] || cmd, 60 + (i % 3) * 180, 170 + Math.floor(i / 3) * 26, { size: 15 }));
        R.text('Magic', 40, 260, { color: R.COL.cyan });
        ab.spells.slice(0, 18).forEach((s, i) => R.text((D.spells[s.id] || {}).name || s.id, 60 + (i % 4) * 140, 290 + Math.floor(i / 4) * 24, { size: 14 }));
        if (ab.summons.length) { R.text('Summon', 40, 420, { color: R.COL.cyan }); R.text(ab.summons.map(s => (D.summons[s.id] || {}).name).join(', '), 140, 420, { size: 14 }); }
      }
    }
  }
  UI.StatusPanel = StatusPanel;
})();

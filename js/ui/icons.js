// Small FF7 menu icons, drawn procedurally (no image files): the potion bottle for items, one glyph
// per weapon type (sword, gun-arm, glove, staff, headdress, shuriken, megaphone, spear, gun), the
// armlet for armour, a ring for accessories and the materia orb. Grey metal with a white shine and a
// dark outline, like the PS1 menu sprites (ref: references/... Materia & Equipment.png, shop shot 133).
//   UI.itemIcon(ctx, x, y, kind, size = 16)   (x, y) = top-left of the size x size cell (16 = FF7's icon to
//                                             text proportion with the 17 px menu font)
//   UI.iconKind(id)                           item / weapon / armour / accessory id, or 'materia:<id>' -> kind
//   UI.orb(ctx, x, y, r, col)                 glossy materia sphere centred on (x, y)
// Kinds: item, sword, gunarm, glove, staff, headdress, shuriken, megaphone, spear, gun, armlet,
// accessory, materia, materia:<type> (magic / support / command / independent / summon).
(function () {
  const U = FF7.util, R = FF7.render, UI = FF7.ui;
  const OUT = '#16161e';
  const WEAPON = { cloud: 'sword', young_cloud: 'sword', sephiroth: 'sword', barret: 'gunarm', tifa: 'glove', aeris: 'staff',
    redxiii: 'headdress', yuffie: 'shuriken', caitsith: 'megaphone', cid: 'spear', vincent: 'gun', reno: 'staff', rude: 'glove', elena: 'gun' };

  // Materia orb: glossy sphere with a white highlight up-left and a darker rim (FF7 menu sprite)
  UI.orb = function (c, x, y, r, col) {
    c.save();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.22, U.shade(col, 0.35)); g.addColorStop(0.6, col); g.addColorStop(1, U.shade(col, -0.55));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = U.shade(col, -0.7); c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - r * 0.38, y - r * 0.42, r * 0.18, 0, Math.PI * 2); c.fill();
    c.restore();
  };

  // ---------------------------------------------------------------- drawing helpers (16 x 16 unit space)
  function metal(c, x0, y0, x1, y1, lo = '#55555f', mid = '#b2b2be') {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, mid); g.addColorStop(1, lo);
    return g;
  }
  function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
  function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  function paint(c, fill, lw = 1.1) { c.fillStyle = fill; c.fill(); c.strokeStyle = OUT; c.lineWidth = lw; c.stroke(); }
  // One outline around the union of several shapes: thick dark strokes first, the fills on top.
  function solid(c, shapes, fill, lw = 1.1) {
    c.strokeStyle = OUT; c.lineWidth = lw * 2;
    shapes.forEach(s => { s(); c.stroke(); });
    c.fillStyle = fill;
    shapes.forEach(s => { s(); c.fill(); });
  }
  function line(c, x0, y0, x1, y1, col, lw) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }

  const GLYPH = {
    item(c) {             // potion bottle: cork, neck and a round glass body with liquid and a shine
      const glass = c.createLinearGradient(3, 4, 13, 15);
      glass.addColorStop(0, '#f6fbff'); glass.addColorStop(0.5, '#a9c6e6'); glass.addColorStop(1, '#4f6f9e');
      solid(c, [() => poly(c, [[6.1, 2.6], [9.9, 2.6], [9.9, 6.6], [6.1, 6.6]]), () => circle(c, 8, 10.6, 4.9)], glass);
      c.beginPath(); c.arc(8, 10.6, 3.9, -0.2, Math.PI + 0.2); c.closePath(); c.fillStyle = '#3fa6de'; c.fill();
      poly(c, [[5.5, 0.6], [10.5, 0.6], [10.5, 3.2], [5.5, 3.2]]); paint(c, '#c8955a');
      ellipse(c, 6.2, 9.2, 1.1, 1.6); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();
    },
    sword(c) {            // broad blade from the hilt (bottom-left) to the tip (top-right)
      c.translate(8, 8); c.rotate(-Math.PI / 4);
      poly(c, [[-3, -1.9], [7.4, -1.9], [10.2, 0], [7.4, 1.9], [-3, 1.9]]); paint(c, metal(c, 0, -1.9, 0, 1.9));
      line(c, -2.4, -0.9, 7.6, -0.9, 'rgba(255,255,255,0.95)', 0.7);
      poly(c, [[-4.5, -3.5], [-2.9, -3.5], [-2.9, 3.5], [-4.5, 3.5]]); paint(c, metal(c, 0, -3.5, 0, 3.5, '#44444e'));
      poly(c, [[-8.6, -1], [-4.5, -1], [-4.5, 1], [-8.6, 1]]); paint(c, '#6e5c48');
      circle(c, -9.2, 0, 1.3); paint(c, '#c8c8d2');
    },
    gunarm(c) {           // Barret's gun-arm: barrel sleeve and a round drum face with holes
      poly(c, [[1, 5], [8.4, 5], [8.4, 12.4], [1, 12.4]]); paint(c, metal(c, 0, 5, 0, 12.4));
      line(c, 3.8, 5.6, 3.8, 11.8, '#44444e', 1);
      circle(c, 10.2, 8.7, 5.3); paint(c, metal(c, 5.5, 3.5, 14.5, 14));
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 2; circle(c, 10.2 + Math.cos(a) * 2.9, 8.7 + Math.sin(a) * 2.9, 0.95); c.fillStyle = OUT; c.fill(); }
      circle(c, 10.2, 8.7, 0.9); c.fillStyle = OUT; c.fill();
    },
    glove(c) {            // Tifa's knuckle: rounded fist with finger grooves over a banded cuff
      poly(c, [[3.6, 10.4], [12.4, 10.4], [12.4, 15], [3.6, 15]]); paint(c, metal(c, 0, 10.4, 0, 15, '#3e3e48', '#8e8e9a'));
      line(c, 4.2, 12.7, 11.8, 12.7, '#d8d8e2', 0.8);
      solid(c, [() => { c.beginPath(); c.moveTo(2.4, 11); c.lineTo(2.4, 5); c.quadraticCurveTo(2.4, 1.2, 8, 1.2); c.quadraticCurveTo(13.6, 1.2, 13.6, 5); c.lineTo(13.6, 11); c.closePath(); },
        () => ellipse(c, 2.8, 8, 1.9, 2.6)], metal(c, 4, 1, 12, 11));
      [5.6, 8, 10.4].forEach(x => line(c, x, 2.2, x, 5.4, '#50505c', 0.9));
      [4.4, 6.8, 9.2, 11.6].forEach(x => { circle(c, x, 6.6, 0.8); c.fillStyle = '#ffffff'; c.fill(); });
    },
    staff(c) {            // Aeris' rod: thin shaft with a gold collar and an orb head
      c.translate(8, 8); c.rotate(-Math.PI / 4);
      poly(c, [[-9.8, -0.8], [4.4, -0.8], [4.4, 0.8], [-9.8, 0.8]]); paint(c, metal(c, 0, -0.8, 0, 0.8), 0.9);
      poly(c, [[3.4, -1.6], [4.9, -1.6], [4.9, 1.6], [3.4, 1.6]]); paint(c, '#d6b25c', 0.9);
      const g = c.createRadialGradient(6.4, -0.8, 0.2, 7.2, 0, 2.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#a8d4ff'); g.addColorStop(1, '#3a68a8');
      circle(c, 7.2, 0, 2.5); paint(c, g, 0.9);
    },
    headdress(c) {        // Red XIII's feathered clip: stacked chevrons along a diagonal pin
      c.translate(8.8, 8.8); c.rotate(Math.PI / 4);
      line(c, 1, 0, 7.2, 0, OUT, 1.8); line(c, 1, 0, 7, 0, '#e2e2ea', 0.7);
      for (let k = 0; k < 4; k++) {
        const x = -5.4 + k * 2.7;
        poly(c, [[x - 0.9, -3.2], [x + 1.9, 0], [x - 0.9, 3.2], [x - 2.7, 3.2], [x + 0.1, 0], [x - 2.7, -3.2]]);
        paint(c, k % 2 ? metal(c, 0, -3.2, 0, 3.2, '#4a4a54') : metal(c, 0, -3.2, 0, 3.2, '#6c6c78', '#d0d0da'), 0.9);
      }
    },
    shuriken(c) {         // Yuffie's four-bladed shuriken with a centre hole
      c.translate(8, 8); c.rotate(0.3);
      const pts = [];
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 2.3 : 7.3; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      poly(c, pts); paint(c, metal(c, -6, -6, 6, 6));
      [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2; line(c, Math.cos(a) * 2.2, Math.sin(a) * 2.2, Math.cos(a + 0.12) * 5.6, Math.sin(a + 0.12) * 5.6, 'rgba(255,255,255,0.85)', 0.6); });
      circle(c, 0, 0, 1.4); c.fillStyle = OUT; c.fill();
    },
    megaphone(c) {        // Cait Sith's megaphone: cone opening to the right, handle underneath
      poly(c, [[4.2, 8.8], [6.2, 8.8], [5.4, 13.8], [3.4, 13.8]]); paint(c, '#5c5c68');
      poly(c, [[1.4, 6.3], [3.2, 6.3], [11.4, 2.1], [11.4, 13.9], [3.2, 9.7], [1.4, 9.7]]); paint(c, metal(c, 0, 2, 0, 14));
      ellipse(c, 11.7, 8, 2.3, 5.9); paint(c, metal(c, 9, 2, 14, 14, '#6a6a76', '#d4d4de'));
      ellipse(c, 12, 8, 1.2, 4.3); c.fillStyle = '#22222a'; c.fill();
    },
    spear(c) {            // Cid's spear: long shaft, collar and a leaf blade at the top right
      c.translate(8, 8); c.rotate(-Math.PI / 4);
      poly(c, [[-10, -0.8], [3, -0.8], [3, 0.8], [-10, 0.8]]); paint(c, '#8c6c4c', 0.9);
      poly(c, [[2.2, -1.9], [3.7, -1.9], [3.7, 1.9], [2.2, 1.9]]); paint(c, metal(c, 0, -1.9, 0, 1.9), 0.9);
      poly(c, [[3.7, 0], [5.8, -2.3], [10.5, 0], [5.8, 2.3]]); paint(c, metal(c, 0, -2.3, 0, 2.3), 0.9);
      line(c, 4.6, -0.6, 9.2, -0.2, 'rgba(255,255,255,0.9)', 0.6);
    },
    gun(c) {              // Vincent's revolver, barrel pointing up-right
      c.translate(8, 8); c.rotate(-0.4); c.translate(-8, -8);
      poly(c, [[3.4, 7.6], [7.6, 7.6], [6.2, 13.4], [2.4, 13.2]]); paint(c, '#5e4a38');
      c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.arc(8.4, 9, 1.5, 0, Math.PI); c.stroke();
      poly(c, [[4.2, 4.4], [15.2, 4.4], [15.2, 6.8], [4.2, 6.8]]); paint(c, metal(c, 0, 4.4, 0, 6.8, '#3e3e48'));
      poly(c, [[4.6, 3.4], [9.4, 3.4], [9.4, 8.8], [4.6, 8.8]]); paint(c, metal(c, 0, 3.4, 0, 8.8));
      line(c, 5.4, 5, 8.6, 5, '#ffffff', 0.7);
      poly(c, [[2.8, 2.6], [4.8, 3.4], [4.8, 5], [3.2, 5]]); paint(c, '#6a6a76', 0.8);
    },
    armlet(c) {           // armlet / bangle: short studded cylinder seen at an angle
      c.translate(8, 8); c.rotate(-0.6);
      ellipse(c, -4.9, 0, 1.7, 4.5); paint(c, '#50505a');
      poly(c, [[-4.9, -4.5], [3.1, -4.5], [3.1, 4.5], [-4.9, 4.5]]); c.fillStyle = metal(c, 0, -4.5, 0, 4.5, '#5c5c68', '#c4c4ce'); c.fill();
      line(c, -4.9, -4.5, 3.1, -4.5, OUT, 1.1); line(c, -4.9, 4.5, 3.1, 4.5, OUT, 1.1);
      [-2.7, 0.5].forEach(x => { line(c, x, -4.1, x, 4.1, '#4a4a56', 1.1); [-2.4, 0, 2.4].forEach(y => { circle(c, x + 1, y, 0.6); c.fillStyle = '#ffffff'; c.fill(); }); });
      ellipse(c, 3.1, 0, 1.7, 4.5); paint(c, metal(c, 1.4, -4.5, 4.8, 4.5, '#6a6a76', '#dcdce6'));
      ellipse(c, 3.3, 0, 0.9, 3.2); c.fillStyle = '#2a2a34'; c.fill();
    },
    accessory(c) {        // ring with a red gem
      const g = c.createLinearGradient(3, 5, 13, 15);
      g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#e0b448'); g.addColorStop(1, '#8a6414');
      c.beginPath(); c.arc(8, 10, 4.3, 0, Math.PI * 2); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      c.beginPath(); c.arc(8, 10, 4.3, 0, Math.PI * 2); c.strokeStyle = g; c.lineWidth = 2; c.stroke();
      poly(c, [[8, 0.9], [10.8, 3.7], [8, 6.5], [5.2, 3.7]]); paint(c, '#e0344e', 1);
      poly(c, [[8, 1.9], [9.3, 3.3], [8, 3.9], [6.7, 3.3]]); c.fillStyle = 'rgba(255,220,230,0.9)'; c.fill();
    },
  };

  UI.itemIcon = function (ctx, x, y, kind, size = 16) {
    if (!kind) return;
    const c = ctx || R.ctx;
    if (kind === 'materia' || kind.startsWith('materia:')) {
      const t = kind.slice(8) || 'magic';
      UI.orb(c, x + size / 2, y + size / 2, size * 0.42, FF7.sys.materia.color(t));
      return;
    }
    const g = GLYPH[kind]; if (!g) return;
    c.save();
    c.translate(x, y); c.scale(size / 16, size / 16);
    c.lineJoin = 'round';
    g(c);
    c.restore();
  };

  // Icon kind for an inventory id: weapons by their owner, 'materia:<type>' for materia; key items get none.
  UI.iconKind = function (id) {
    if (!id) return null;
    if (id.startsWith && id.startsWith('materia:')) { const m = FF7.data.materia[id.slice(8)]; return 'materia:' + (m ? m.type : 'magic'); }
    const f = U.findItem(id); if (!f) return null;
    if (f.kind === 'weapon') return WEAPON[f.def.char] || 'sword';
    if (f.kind === 'armor') return 'armlet';
    if (f.kind === 'accessory') return 'accessory';
    return 'item';
  };
})();

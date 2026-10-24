// Sign audit (a dev helper run in a side tab of the running game, never shipped): every word put on a building (wall
// labels, cloth banners, neon boards) is projected through the field camera from the walkable tiles in front of it,
// and the ones never wholly on the screen are listed (above the top, off a side, behind the camera). Also lists the
// banners whose lettering is wider than the cloth. Usage, after the game has loaded:
//   const s = document.createElement('script'); s.src = '/tools/sign_audit.js'; document.head.appendChild(s);
//   await SIGNS.audit()      -> { checked, bad: [...] }   (loads each map with signs in turn: saves are stubbed first)
//   SIGNS.overflow()         -> banners whose text runs off the cloth
(function () {
  const keep = /^(list|read|demoSlot|demoSummary|autoSummary|lastSlot|hasAny|SLOTS|migrate)$/;
  for (const k of Object.keys(FF7.save)) if (typeof FF7.save[k] === 'function' && !keep.test(k)) FF7.save[k] = () => true;
  if (FF7.kupomon) { FF7.kupomon.save = () => true; FF7.kupomon.saveDemo = () => true; }
  const F = FF7.field, GL = FF7.GL, DIRS = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
  const wallSign = (L) => L && L.text != null && (L.face || L.on === 'wall' || (L.y || 0) > 0.5);
  const hasSigns = (M) => M && ((M.labels || []).some(wallSign) || (M.props || []).some(o => o && ((o.prop === 'banner' && (o.text || o.text2)) || (o.prop === 'neon' && o.text))));
  // a prop's anchor as fieldgeo places it (on a wall tile it hangs on the face it looks out of)
  const anchor = (P, o) => {
    const TILE = F.TILE, ax = o.at[0], ay = o.at[1], tx = Math.round(ax), ty = Math.round(ay), t = P.at(tx, ty), r = (o.rot || 0) * Math.PI / 180, fx = Math.round(Math.sin(r)), fz = Math.round(Math.cos(r));
    let x = (ax + 0.5) * TILE, z = (ay + 0.5) * TILE, y = o.y0 != null ? o.y0 : P.el(Math.floor(ax + 0.5), Math.floor(ay + 0.5));
    if ((t.wall || t.prop === 'door') && Number.isInteger(ax) && Number.isInteger(ay)) { x += fx * (TILE / 2 + 0.03); z += fz * (TILE / 2 + 0.03); if (o.y0 == null && P.walkable(tx + fx, ty + fz)) y = P.el(tx + fx, ty + fz); }
    return { x, y, z, tx, ty, dx: fx, dy: fz, u: [Math.cos(r), -Math.sin(r)] };
  };
  const quad = (x, z, u, half, top, bot) => [[x - u[0] * half, top, z - u[1] * half], [x + u[0] * half, top, z + u[1] * half], [x - u[0] * half, bot, z - u[1] * half], [x + u[0] * half, bot, z + u[1] * half]];
  function signsOf(P, M) {
    const TILE = F.TILE, out = [];
    (M.labels || []).forEach(L => {
      if (!wallSign(L)) return;
      const ax = L.at[0], ay = L.at[1], tx = Math.round(ax), ty = Math.round(ay), t = P.at(tx, ty), face = L.face || 's', [dx, dy] = DIRS[face] || DIRS.s;
      let x = (ax + 0.5) * TILE, z = (ay + 0.5) * TILE; if (t.wall || t.prop === 'door') { x += dx * TILE / 2; z += dy * TILE / 2; }
      // (on a building's tile: out on that building's face, as fieldgeo places it)
      const bl = (M.buildings || []).map(b => ({ x0: b.at[0], y0: b.at[1], x1: b.at[0] + (b.at[2] || 1), y1: b.at[1] + (b.at[3] || 1), h: b.h, over: b.over, top: b.top })).find(b => tx >= b.x0 && tx < b.x1 && ty >= b.y0 && ty < b.y1);
      let ftx = tx, fty = ty;
      if (bl) { if (dy > 0) { z = bl.y1 * TILE; fty = bl.y1; } else if (dy < 0) { z = bl.y0 * TILE; fty = bl.y0 - 1; } else if (dx > 0) { x = bl.x1 * TILE; ftx = bl.x1; } else { x = bl.x0 * TILE; ftx = bl.x0 - 1; } }
      const fy = bl ? (ftx >= 0 && fty >= 0 && ftx < P.w && fty < P.h ? P.el(ftx, fty) : P.el(tx, ty)) : t.wall ? (P.walkable(tx + dx, ty + dy) ? P.el(tx + dx, ty + dy) : 0) : P.el(tx, ty);
      const size = L.size || 0.3, ov = bl && /gable|shed|hip/.test(bl.top || '') ? (bl.over != null ? bl.over : 0.14) : 0;
      const yc = fy + (bl && bl.h != null ? Math.min(L.y != null ? L.y : 1.4, bl.h - ov * 1.6 - 0.06 - size * 0.85) : (L.y != null ? L.y : 1.4)), tw = F.textWidth(String(L.text), size), u = face === 's' || face === 'n' ? [1, 0] : [0, 1];
      out.push({ kind: 'label', text: String(L.text), tx, ty, dx, dy, pts: quad(x, z, u, tw / 2, yc + size * 0.8, yc - size * 0.3) });
    });
    (M.props || []).forEach(o => {
      if (!o || !o.at) return;
      // (on a building: under its eave, as fieldgeo keeps it)
      const bb = Number.isInteger(o.at[0]) && Number.isInteger(o.at[1]) && (P.at(o.at[0], o.at[1]).wall || P.at(o.at[0], o.at[1]).prop === 'door') && (M.buildings || []).find(b => { const tx = Math.round(o.at[0]), ty = Math.round(o.at[1]); return tx >= b.at[0] && tx < b.at[0] + (b.at[2] || 1) && ty >= b.at[1] && ty < b.at[1] + (b.at[3] || 1); });
      const lim = bb ? P.el(Math.round(o.at[0]), Math.round(o.at[1])) + (bb.h != null ? bb.h : 2.4) - (/gable|shed|hip/.test(bb.top || '') ? (bb.over != null ? bb.over : 0.14) : 0) * 1.6 - 0.06 : Infinity;
      if (o.prop === 'banner' && (o.text || o.text2)) {
        const a = anchor(P, o), top = Math.min(lim, a.y + (o.y != null ? o.y : 2.2)), L = o.h || 1.4, w = TILE * (o.w || 1);
        out.push({ kind: 'banner', text: o.text || o.text2, tx: a.tx, ty: a.ty, dx: a.dx, dy: a.dy, pts: quad(a.x, a.z, a.u, w / 2, top, top - L) });
      } else if (o.prop === 'neon' && o.text) {
        const a = anchor(P, o), size = o.size || TILE * 0.34, yc = Math.min(lim - size * 0.9, a.y + (o.y != null ? o.y : TILE * 2.4)), tw = F.textWidth(o.text, size) + size * 0.9;
        out.push({ kind: 'neon', text: o.text, tx: a.tx, ty: a.ty, dx: a.dx, dy: a.dy, pts: quad(a.x, a.z, a.u, tw / 2, yc + size * 0.9, yc - size * 0.9) });
      }
    });
    return out;
  }
  // the best view of a sign: the player on each walkable tile out in front of it (or, failing those, the nearest)
  function bestView(fs, it) {
    const P = fs.P, pl = fs.player, TILE = F.TILE, W = FF7.W, H = FF7.H, tiles = [];
    // (never on an exit: a view taken there walks the player out through the door)
    const exitAt = (x, y) => (fs.map.exits || []).some(e => e.at && x >= e.at[0] && x < e.at[0] + (e.at[2] || 1) && y >= e.at[1] && y < e.at[1] + (e.at[3] || 1));
    for (let k = 1; k <= 7; k++) for (const side of [0, -1, 1, -2, 2]) { const sx = it.tx + it.dx * k + (it.dy ? side : 0), sy = it.ty + it.dy * k + (it.dx ? side : 0); if (P.walkable(sx, sy) && !exitAt(sx, sy)) tiles.push([sx, sy]); }
    if (!tiles.length) { let b = null; for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) if (P.walkable(x, y)) { const d = Math.abs(x - it.tx) + Math.abs(y - it.ty); if (!b || d < b[2]) b = [x, y, d]; } if (b) tiles.push([b[0], b[1]]); }
    let best = null;
    for (const [sx, sy] of tiles) {
      pl.x = (sx + 0.5) * TILE; pl.z = (sy + 0.5) * TILE; pl.y = F.groundAt(P, pl.x, pl.z); fs.cam.pan = null; fs.updateCamera(true);
      const c = fs.cameraEye(); GL.camera(c.eye, c.target, fs.cam.fov || 36, 0.1, 500);
      const pr = it.pts.map(p => GL.project(p)), ys = pr.map(q => q.y), xs = pr.map(q => q.x);
      const minY = Math.min(...ys), maxY = Math.max(...ys), minX = Math.min(...xs), maxX = Math.max(...xs);
      const ok = pr.every(q => q.visible !== false) && minY >= 0 && maxY <= H && minX >= 0 && maxX <= W;
      const score = (ok ? 1e4 : 0) - Math.max(0, -minY) - Math.max(0, maxY - H) - Math.max(0, -minX) - Math.max(0, maxX - W);
      if (!best || score > best.score) best = { score, ok, at: [sx, sy], minY: Math.round(minY), maxY: Math.round(maxY), minX: Math.round(minX), maxX: Math.round(maxX) };
    }
    return best;
  }
  // line of sight: rays from the camera to the sign's middle and its corners (drawn in a fifth), through every triangle
  // of the map's baked meshes, stopping short of the sign itself; how many of the five are blocked (a sign inside a
  // wall, or behind a roof or a pillar, passes the screen test and is still never seen)
  function blocked(fs, it, at) {
    const P = fs.P, pl = fs.player, TILE = F.TILE;
    pl.x = (at[0] + 0.5) * TILE; pl.z = (at[1] + 0.5) * TILE; pl.y = F.groundAt(P, pl.x, pl.z); fs.cam.pan = null; fs.updateCamera(true);
    const eye = fs.cameraEye().eye, g = fs.geo, meshes = [g.mesh].concat(...(g.occluders || []).map(o => o.meshes || [o.mesh])).filter(m => m && m.pos);
    const c = [0, 1, 2].map(k => it.pts.reduce((s, p) => s + p[k], 0) / 4);
    const targets = [c].concat(it.pts.map(p => [0, 1, 2].map(k => c[k] + (p[k] - c[k]) * 0.8)));
    let n = 0;
    for (const t of targets) {
      const d = [t[0] - eye[0], t[1] - eye[1], t[2] - eye[2]], len = Math.hypot(d[0], d[1], d[2]), tmax = 1 - 0.12 / len;
      let hit = false;
      for (const m of meshes) {
        const A = m.pos;
        for (let i = 0; i + 8 < A.length && !hit; i += 9) {
          const e1x = A[i + 3] - A[i], e1y = A[i + 4] - A[i + 1], e1z = A[i + 5] - A[i + 2], e2x = A[i + 6] - A[i], e2y = A[i + 7] - A[i + 1], e2z = A[i + 8] - A[i + 2];
          const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-9 && det < 1e-9) continue;
          const inv = 1 / det, sx = eye[0] - A[i], sy = eye[1] - A[i + 1], sz = eye[2] - A[i + 2], u = (sx * px + sy * py + sz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt > 0.02 && tt < tmax) hit = true;
        }
        if (hit) break;
      }
      if (hit) n++;
    }
    return n;
  }
  window.SIGNS = {
    maps: () => Object.keys(FF7.maps).filter(id => hasSigns(FF7.maps[id])),
    async audit(ids) {
      const res = [], errs = [];
      for (const id of ids || SIGNS.maps()) {
        let fs; try { fs = F.start(id); } catch (e) { errs.push(id + ': ' + e.message); continue; }
        if (!fs || !fs.P || !fs.map || fs.map.id !== id) { errs.push(id + ': did not load'); continue; }
        for (const it of signsOf(fs.P, FF7.maps[id])) {
          const best = bestView(fs, it);
          res.push({ map: id, kind: it.kind, text: it.text, best, hidden: best ? blocked(fs, it, best.at) : 5 });
        }
        await new Promise(r => setTimeout(r, 0));
      }
      // bad: never wholly on the screen, or its middle and most of its corners out of sight
      return { checked: res.length, bad: res.filter(r => !r.best || !r.best.ok || r.hidden >= 3), errs };
    },
    // show one sign on the screen: the map loaded, the player on the tile with its best view, the fade lifted
    async view(id, text) {
      if (window.KPG) KPG.show([], 1);
      const fs = F.start(id);
      for (let i = 0; i < 40; i++) FF7.stepFrame();
      const it = signsOf(fs.P, FF7.maps[id]).find(s => s.text === text);
      if (!it) return 'no sign "' + text + '" in ' + id;
      const b = bestView(fs, it), pl = fs.player, TILE = F.TILE;
      pl.x = (b.at[0] + 0.5) * TILE; pl.z = (b.at[1] + 0.5) * TILE; pl.y = F.groundAt(fs.P, pl.x, pl.z); pl.tx = b.at[0]; pl.ty = b.at[1];
      fs.cam.pan = null; fs.updateCamera(true);
      FF7.sceneMgr.fader.alpha = 0; FF7.sceneMgr.fader.target = 0;
      for (let i = 0; i < 4; i++) { FF7.stepFrame(); await new Promise(r => setTimeout(r, 80)); }
      return b;
    },
    overflow() {
      const TILE = F.TILE, out = [];
      for (const id of Object.keys(FF7.maps)) (FF7.maps[id].props || []).forEach(o => {
        if (!o || o.prop !== 'banner' || !o.text) return;
        const w = TILE * (o.w || 1), L = o.h || 1.4, size = Math.min(o.size || L * 0.3, w * 0.88 / Math.max(1, F.textWidth(o.text, 1))), tw = F.textWidth(o.text, 1) * size;
        if (tw > w * 0.92) out.push(id + ' "' + o.text + '" ' + tw.toFixed(2) + ' > ' + w.toFixed(2));
      });
      return out;
    },
  };
  console.log('SIGNS ready');
})();

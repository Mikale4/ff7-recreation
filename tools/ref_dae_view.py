"""Reference viewer for the Collada (.dae) and Wavefront (.obj + .mtl) model rips in references/
(look-only: nothing is copied into the game). Renders flat-shaded turnarounds so our procedural
models can be matched by eye.

  python tools/ref_dae_view.py <file.dae|file.obj> [--out sheet.png] [--size 320] [--views front,34,side,back,top,field,fieldfront]
                               [--focus head] [--yaw DEG] [--flip  (PS1 rips exported upside down)]
                               [--box x0,z0,x1,z1] [--span UNITS] [--tex] [--gain K]

Views look at the model like our tools/render_model.js does (the model faces +z = toward the viewer
in `front`). `field` = FF7's high field camera from behind, `fieldfront` = the same from the front,
`world` / `world34` = our world-map camera (30 degrees down, from the south / turned 35 degrees).

--box   keep only the faces whose centre lies inside x0..x1, z0..z1 (model units, after Y-up), e.g. one
        landmark out of the whole FF7 world map (references/world maps/.../Gaia.obj, 288 x 256 units).
--span  fixed width of the view in model units (default: fit the model), so crops share one scale.
--tex   textured z-buffer rendering (per-pixel texture lookup instead of one colour per triangle);
        on by default for .obj. --gain scales texture colours (default 2 for .obj: PS1 textures are
        stored at half brightness and doubled by the GPU's texture modulation).
"""
import sys, math, os, re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}


def floats(t):
    return [float(v) for v in t.split()]


def mat4(vals):
    return [vals[i * 4:(i + 1) * 4] for i in range(4)]


def mmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def xform(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3)]


IDENT = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]


def load(path, flip=False):
    root = ET.parse(path).getroot()
    base = os.path.dirname(path)
    up = (root.findtext('c:asset/c:up_axis', 'Y_UP', NS) or 'Y_UP').strip()
    # images -> PIL
    images = {}
    for im in root.findall('.//c:library_images/c:image', NS):
        f = im.findtext('c:init_from', '', NS).strip()
        fp = os.path.join(base, f.replace('%20', ' '))
        if os.path.exists(fp):
            images[im.get('id')] = Image.open(fp).convert('RGB')
    # effects -> texture image or colour
    effects = {}
    for ef in root.findall('.//c:library_effects/c:effect', NS):
        surf = {}
        for np_ in ef.findall('.//c:newparam', NS):
            s = np_.find('c:surface/c:init_from', NS)
            if s is not None: surf[np_.get('sid')] = s.text.strip()
            sm = np_.find('c:sampler2D/c:source', NS)
            if sm is not None: surf[np_.get('sid')] = surf.get(sm.text.strip(), sm.text.strip())
        d = ef.find('.//c:diffuse', NS)
        e = {'color': (200, 200, 200), 'img': None}
        if d is not None:
            tx = d.find('c:texture', NS)
            col = d.find('c:color', NS)
            if tx is not None:
                e['img'] = images.get(surf.get(tx.get('texture'), tx.get('texture')))
            if col is not None:
                v = floats(col.text)
                e['color'] = tuple(int(max(0, min(1, x)) * 255) for x in v[:3])
        effects[ef.get('id')] = e
    materials = {}
    for m in root.findall('.//c:library_materials/c:material', NS):
        ie = m.find('c:instance_effect', NS)
        materials[m.get('id')] = effects.get(ie.get('url')[1:]) if ie is not None else None
    # geometries -> list of (material symbol, [(p0,p1,p2),(uv0,uv1,uv2)])
    geoms = {}
    for g in root.findall('.//c:library_geometries/c:geometry', NS):
        mesh = g.find('c:mesh', NS)
        if mesh is None: continue
        srcs = {}
        for s in mesh.findall('c:source', NS):
            fa = s.find('c:float_array', NS)
            acc = s.find('.//c:accessor', NS)
            stride = int(acc.get('stride', '1')) if acc is not None else 1
            vals = floats(fa.text or '')
            srcs[s.get('id')] = [vals[i:i + stride] for i in range(0, len(vals), stride)]
        verts = {}
        for v in mesh.findall('c:vertices', NS):
            for inp in v.findall('c:input', NS):
                if inp.get('semantic') == 'POSITION': verts[v.get('id')] = srcs[inp.get('source')[1:]]
        tris = []
        for tri in mesh.findall('c:triangles', NS) + mesh.findall('c:polylist', NS):
            inputs = tri.findall('c:input', NS)
            stride = max(int(i.get('offset')) for i in inputs) + 1
            pos = uv = col = None; po = uo = co = 0
            for i in inputs:
                sem, src, off = i.get('semantic'), i.get('source')[1:], int(i.get('offset'))
                if sem == 'VERTEX': pos, po = verts[src], off
                elif sem == 'TEXCOORD' and uv is None: uv, uo = srcs[src], off
                elif sem == 'COLOR' and col is None: col, co = srcs[src], off
            idx = [int(x) for x in (tri.findtext('c:p', '', NS) or '').split()]
            vc = tri.find('c:vcount', NS)
            counts = [int(x) for x in vc.text.split()] if vc is not None else [3] * (len(idx) // stride // 3)
            k = 0
            for n in counts:
                poly = [idx[(k + j) * stride:(k + j + 1) * stride] for j in range(n)]
                k += n
                for j in range(1, n - 1):
                    a, b, c = poly[0], poly[j], poly[j + 1]
                    P = (pos[a[po]], pos[b[po]], pos[c[po]])
                    UV = (uv[a[uo]], uv[b[uo]], uv[c[uo]]) if uv else None
                    VC = tuple(int(max(0, min(1, sum(col[v[co]][i] for v in (a, b, c)) / 3)) * 255) for i in range(3)) if col else None
                    tris.append((tri.get('material'), P, UV, VC))
        geoms[g.get('id')] = tris
    # skin controllers (rigged battle models): bind-pose mesh = bind_shape_matrix * geometry
    controllers = {}
    for ct in root.findall('.//c:library_controllers/c:controller', NS):
        sk = ct.find('c:skin', NS)
        if sk is None: continue
        bsm = sk.findtext('c:bind_shape_matrix', None, NS)
        controllers[ct.get('id')] = (sk.get('source')[1:], mat4(floats(bsm)) if bsm else IDENT)
    # visual scene: nested nodes with matrices
    out = []

    def walk(node, M):
        mt = node.find('c:matrix', NS)
        if mt is not None: M = mmul(M, mat4(floats(mt.text)))
        for ig in node.findall('c:instance_geometry', NS):
            if 'icosphere' in ig.get('url', '').lower(): continue     # exporter helper, not part of the model
            bind = {}
            for im in ig.findall('.//c:instance_material', NS):
                bind[im.get('symbol')] = materials.get(im.get('target')[1:])
            for sym, P, UV, VC in geoms.get(ig.get('url')[1:], []):
                out.append(([xform(M, p) for p in P], UV, bind.get(sym), VC))
        for ic in node.findall('c:instance_controller', NS):
            gid, bsm = controllers.get(ic.get('url')[1:], (None, IDENT))
            bind = {}
            for im in ic.findall('.//c:instance_material', NS):
                bind[im.get('symbol')] = materials.get(im.get('target')[1:])
            for sym, P, UV, VC in geoms.get(gid, []):
                out.append(([xform(bsm, p) for p in P], UV, bind.get(sym), VC))   # skinned: bind pose, no node xform
        for ch in node.findall('c:node', NS):
            walk(ch, M)

    for vs in root.findall('.//c:library_visual_scenes/c:visual_scene', NS):
        for n in vs.findall('c:node', NS): walk(n, IDENT)
    # Z-up -> Y-up (x, y, z) -> (x, z, -y)
    if up == 'Z_UP':
        out = [([[p[0], p[2], -p[1]] for p in P], UV, m, vc) for P, UV, m, vc in out]
    if flip:                              # PS1 rips exported with -Y up: rotate 180 degrees about X
        out = [([[p[0], -p[1], -p[2]] for p in P], UV, m, vc) for P, UV, m, vc in out]
    return out


def load_mtl(path):
    """Wavefront .mtl -> {name: {'color', 'img', 'file'}} (diffuse colour and diffuse texture path)."""
    mats, cur, base = {}, None, os.path.dirname(path)
    if not os.path.exists(path): return mats
    for line in open(path, errors='replace'):
        p = line.split()
        if not p: continue
        if p[0] == 'newmtl': cur = mats[line.split(None, 1)[1].strip()] = {'color': (200, 200, 200), 'img': None, 'file': None}
        elif cur is None: continue
        elif p[0] == 'Kd' and len(p) >= 4: cur['color'] = tuple(int(max(0, min(1, float(v))) * 255) for v in p[1:4])
        elif p[0] == 'map_Kd': cur['file'] = os.path.join(base, line.split(None, 1)[1].strip().split()[-1])
    return mats


def load_obj(path, box=None, flip=False):
    """Wavefront .obj (Y up): v / vt / f (any polygon, negative indices), usemtl + mtllib materials with
    their map_Kd textures. `box` = (x0, z0, x1, z1): keep only faces whose centre lies inside it."""
    base = os.path.dirname(path)
    mats, V, VT, out, mat = {}, [], [], [], None

    def idx(s, n):
        i = int(s)
        return i - 1 if i > 0 else n + i
    with open(path, errors='replace') as f:
        for line in f:
            c = line[:2]
            if c == 'v ':
                V.append([float(t) for t in line.split()[1:4]])
            elif c == 'vt':
                VT.append([float(t) for t in line.split()[1:3]])
            elif c == 'f ':
                pts = []
                for t in line.split()[1:]:
                    s = t.split('/')
                    pts.append((idx(s[0], len(V)), idx(s[1], len(VT)) if len(s) > 1 and s[1] else None))
                P = [V[i] for i, _ in pts]
                if box:
                    cx = sum(p[0] for p in P) / len(P); cz = sum(p[2] for p in P) / len(P)
                    if not (box[0] <= cx <= box[2] and box[1] <= cz <= box[3]): continue
                UV = [VT[t] for _, t in pts] if all(t is not None for _, t in pts) else None
                for j in range(1, len(pts) - 1):
                    out.append(([P[0], P[j], P[j + 1]], (UV[0], UV[j], UV[j + 1]) if UV else None, mat, None))
            elif line.startswith('usemtl'):
                mat = mats.get(line.split(None, 1)[1].strip()) if len(line.split()) > 1 else None
            elif line.startswith('mtllib'):
                mats.update(load_mtl(os.path.join(base, line.split(None, 1)[1].strip())))
    # textures only for the materials still in use (the world map has ~1100 materials)
    cache = {}
    for m in {id(t[2]): t[2] for t in out if t[2]}.values():
        fp = m.get('file')
        if fp and m['img'] is None and os.path.exists(fp):
            if fp not in cache: cache[fp] = Image.open(fp).convert('RGBA')
            m['rgba'] = cache[fp]; m['img'] = cache[fp].convert('RGB')
    if flip:
        out = [([[p[0], -p[1], -p[2]] for p in P], UV, m, vc) for P, UV, m, vc in out]
    return out


def tri_color(uv, mat, vc=None):
    if vc: return vc
    if not mat: return (190, 190, 190)
    img = mat.get('img')
    if img is not None and uv:
        u = sum(t[0] for t in uv) / 3; v = sum(t[1] for t in uv) / 3
        x = int((u % 1) * (img.width - 1)); y = int((1 - (v % 1)) * (img.height - 1))
        return img.getpixel((x, y))
    return mat.get('color', (190, 190, 190))


VIEWS = {'front': (0, 0), '34': (35, 8), 'side': (90, 0), 'back': (180, 0), 'top': (0, 88),
         'field': (180, 55), 'fieldfront': (0, 55), 'field34': (145, 50), 'world': (0, 30), 'world34': (35, 30)}


def render(tris, yaw, pitch, size, focus=None, bg=(10, 14, 90), span=None, tex=False, gain=1.0):
    # auto-orient: the model's facing is guessed as whichever horizontal axis the nose sticks out on is
    # not known, so views are relative to +z (front) like render_model.js; use --yaw to correct.
    ys = [p[1] for P, *_ in tris for p in P]
    xs = [p[0] for P, *_ in tris for p in P]; zs = [p[2] for P, *_ in tris for p in P]
    lo, hi = min(ys), max(ys)
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    if focus == 'head':
        cy = lo + (hi - lo) * 0.84; span = span or (hi - lo) * 0.36
    else:                                 # fit the longest side (weapons and vehicles lie flat)
        cy = (lo + hi) / 2; span = span or max(hi - lo, max(xs) - min(xs), max(zs) - min(zs)) * 1.1
    ya, pa = math.radians(yaw), math.radians(pitch)
    ld = [-0.35, 0.8, 0.5]; ln = math.sqrt(sum(v * v for v in ld)); ld = [v / ln for v in ld]
    img = Image.new('RGB', (size, size), bg)
    dr = ImageDraw.Draw(img)
    items = []
    for P, UV, mat, vc in tris:
        q = []
        for p in P:
            x, y, z = p[0] - cx, p[1] - cy, p[2] - cz
            x1 = x * math.cos(ya) - z * math.sin(ya); z1 = x * math.sin(ya) + z * math.cos(ya)
            y2 = y * math.cos(pa) - z1 * math.sin(pa); z2 = y * math.sin(pa) + z1 * math.cos(pa)
            q.append((x1, y2, z2))
        a, b, c = P
        n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
        nl = math.sqrt(sum(v * v for v in n)) or 1
        lam = abs(sum(n[i] / nl * ld[i] for i in range(3)))
        k = 0.45 + 0.6 * lam
        if tex:
            items.append((q, UV, mat, vc, k)); continue
        col = tri_color(UV, mat, vc)
        col = tuple(min(255, int(ch * k)) for ch in col)
        depth = sum(v[2] for v in q) / 3
        items.append((depth, q, col))
    s = size / span
    if tex: return raster_tex(items, size, s, bg, gain)
    items.sort(key=lambda t: t[0])       # far (negative z = away) first: viewer looks down -z... sort ascending
    for depth, q, col in items:
        pts = [(size / 2 + v[0] * s, size / 2 - v[1] * s) for v in q]
        dr.polygon(pts, fill=col)
    return img


def raster_tex(items, size, s, bg, gain):
    """z-buffered rasterizer with a per-pixel (nearest texel) texture lookup; alpha-0 texels are holes.
    A material may carry a 'tint' (r, g, b multipliers) that is applied on top of its texture."""
    import numpy as np
    buf = np.empty((size, size, 3), np.float32); buf[:] = bg
    zb = np.full((size, size), -1e30, np.float32)
    arrs = {}
    for q, UV, mat, vc, k in items:
        P = [(size / 2 + v[0] * s, size / 2 - v[1] * s, v[2]) for v in q]
        x0 = max(0, int(math.floor(min(p[0] for p in P)))); x1 = min(size - 1, int(math.ceil(max(p[0] for p in P))))
        y0 = max(0, int(math.floor(min(p[1] for p in P)))); y1 = min(size - 1, int(math.ceil(max(p[1] for p in P))))
        if x0 > x1 or y0 > y1: continue
        (ax, ay, az), (bx, by, bz), (cx, cy, cz) = P
        area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
        if abs(area) < 1e-9: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1, dtype=np.float32) + 0.5, np.arange(y0, y1 + 1, dtype=np.float32) + 0.5)
        w0 = ((bx - X) * (cy - Y) - (cx - X) * (by - Y)) / area
        w1 = ((cx - X) * (ay - Y) - (ax - X) * (cy - Y)) / area
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        Z = w0 * az + w1 * bz + w2 * cz
        sub = zb[y0:y1 + 1, x0:x1 + 1]
        m &= Z > sub
        if not m.any(): continue
        tint = np.array((mat or {}).get('tint', (1, 1, 1)), np.float32)
        img = (mat or {}).get('rgba') or (mat or {}).get('img')
        if img is not None and UV:
            key = id(img)
            if key not in arrs: arrs[key] = np.asarray(img.convert('RGBA'), np.float32)
            A = arrs[key]; th, tw = A.shape[:2]
            U = w0 * UV[0][0] + w1 * UV[1][0] + w2 * UV[2][0]
            V = 1 - (w0 * UV[0][1] + w1 * UV[1][1] + w2 * UV[2][1])
            inside = min(min(t) for t in UV) >= 0 and max(max(t) for t in UV) <= 1
            tx = np.floor(U * tw).astype(np.int32); ty = np.floor(V * th).astype(np.int32)
            tx = np.clip(tx, 0, tw - 1) if inside else tx % tw
            ty = np.clip(ty, 0, th - 1) if inside else ty % th
            T = A[ty, tx]
            m &= T[..., 3] > 0
            col = T[..., :3] * (gain * k) * tint
        else:
            base = np.array(tri_color(UV, mat, vc), np.float32)
            col = np.broadcast_to(base * k * tint, X.shape + (3,))
        bsub = buf[y0:y1 + 1, x0:x1 + 1]
        bsub[m] = col[m]; sub[m] = Z[m]
    return Image.fromarray(np.clip(buf, 0, 255).astype(np.uint8), 'RGB')


def main():
    a = sys.argv[1:]
    path = a[0]
    opt = lambda k, d=None: a[a.index('--' + k) + 1] if '--' + k in a else d
    size = int(opt('size', '320'))
    views = opt('views', 'front,34,side,back,top,field,fieldfront').split(',')
    yaw0 = float(opt('yaw', '0'))
    box = [float(v) for v in opt('box').split(',')] if opt('box') else None
    is_obj = path.lower().endswith('.obj')
    if is_obj:
        tris = load_obj(path, box, '--flip' in a)
    else:
        tris = load(path, '--flip' in a)
        if box:
            tris = [t for t in tris if box[0] <= sum(p[0] for p in t[0]) / 3 <= box[2] and box[1] <= sum(p[2] for p in t[0]) / 3 <= box[3]]
    if not tris:
        print('no triangles' + (' inside the box' if box else '')); return
    tex = is_obj or '--tex' in a
    gain = float(opt('gain', '2' if is_obj else '1'))
    span = float(opt('span')) if opt('span') else None
    imgs = []
    for v in views:
        yw, pt = VIEWS[v]
        imgs.append(render(tris, yw + yaw0, pt, size, opt('focus'), span=span, tex=tex, gain=gain))
    sheet = Image.new('RGB', (size * len(imgs), size))
    for i, im in enumerate(imgs): sheet.paste(im, (i * size, 0))
    out = opt('out', os.path.splitext(os.path.basename(path))[0] + '_ref.png')
    sheet.save(out)
    print('wrote', out, len(tris), 'triangles')


if __name__ == '__main__':
    main()

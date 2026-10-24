#!/usr/bin/env python3
"""Asset pipeline for the FF7 HTML5 recreation (personal study project).

Re-runnable; reads only from references/ and writes:
  assets/portraits/*.png          menu portraits (128x128) + _contact.png
  assets/fx/<FOLDER>/<file>.png   battle-effect sheets with alpha (black -> transparent)
  assets/fx/_contact_NN.png       contact sheets of the effect sheets (with detected frames)
  assets/ui/*.png                 save-menu / misc UI textures
  assets/fx/fx_atlas.js             FF7.data.fxAtlas (frames per sheet)
  docs/fx_atlas.md                human-readable table of all sheets + UI notes

Usage:  python tools/build_assets.py [portraits] [fx] [ui] [docs]   (default: everything)
        --no-contact    skip contact sheets
        --only REGEX    fx debug: process only matching sheet keys -> assets/fx/_debug_NN.png

Alpha PNGs are only rewritten when the source is newer or the alpha settings changed
(assets/fx/.alpha_stamp). assets/fx/_atlas_cache.json lets `docs` run without re-scanning.
Needs Python 3 + Pillow + numpy (scipy optional, used for speed).
"""
import os
import re
import sys
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    from scipy import ndimage as _ndi
except Exception:  # pragma: no cover - scipy is optional
    _ndi = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'references')
FX_SRC = os.path.join(REF, 'FF7')
MISC_DIR = 'ZZ - Miscellanious'
OUT_PORTRAITS = os.path.join(ROOT, 'assets', 'portraits')
OUT_FX = os.path.join(ROOT, 'assets', 'fx')
OUT_UI = os.path.join(ROOT, 'assets', 'ui')
OUT_ATLAS_JS = os.path.join(ROOT, 'assets', 'fx', 'fx_atlas.js')   # not loaded by the game: battle effects are procedural
OUT_DOC = os.path.join(ROOT, 'docs', 'fx_atlas.md')

PORTRAIT_SIZE = 128
ALPHA_GAMMA = 0.85     # alpha = max(R,G,B)^gamma  (<1 keeps dim glow a bit more opaque)
LIT_T = 10             # max-channel threshold for "lit" pixels (frame detection / lum)


# --------------------------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------------------------
def rel(p):
    return os.path.relpath(p, ROOT).replace('\\', '/')


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def load_font(size, bold=False):
    names = (['arialbd.ttf', 'DejaVuSans-Bold.ttf'] if bold else []) + ['arial.ttf', 'DejaVuSans.ttf']
    for n in names:
        for d in ('', 'C:/Windows/Fonts/', '/usr/share/fonts/truetype/dejavu/', '/Library/Fonts/'):
            try:
                return ImageFont.truetype(d + n, size)
            except Exception:
                pass
    return ImageFont.load_default()


def runs(flags):
    """[(start, end_exclusive)] of consecutive True runs in a 1-D bool array."""
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(flags)))
    return out


def label(mask):
    """8-connected component labelling -> (labels, n). scipy if present, else run-based union-find."""
    if _ndi is not None:
        return _ndi.label(mask, structure=np.ones((3, 3), bool))
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    prev = []
    for y in range(h):
        cur = []
        for (x0, x1) in runs(mask[y]):
            ids = [find(l) for (px0, px1, l) in prev if px0 <= x1 and px1 >= x0]  # 8-connectivity
            if ids:
                l = min(ids)
                for o in ids:
                    parent[o] = l
            else:
                l = len(parent)
                parent.append(l)
            cur.append((x0, x1, l))
        for (x0, x1, l) in cur:
            lab[y, x0:x1] = l
        prev = cur
    roots = {}
    lut = np.zeros(len(parent), np.int32)
    for i in range(1, len(parent)):
        r = find(i)
        lut[i] = roots.setdefault(r, len(roots) + 1)
    return lut[lab], len(roots)


def dilate(mask, r):
    if r <= 0:
        return mask
    if _ndi is not None:
        return _ndi.binary_dilation(mask, structure=np.ones((3, 3), bool), iterations=r)
    out = mask.copy()
    for _ in range(r):
        m = out.copy()
        m[1:, :] |= out[:-1, :]; m[:-1, :] |= out[1:, :]
        m[:, 1:] |= out[:, :-1]; m[:, :-1] |= out[:, 1:]
        m[1:, 1:] |= out[:-1, :-1]; m[:-1, :-1] |= out[1:, 1:]
        m[1:, :-1] |= out[:-1, 1:]; m[:-1, 1:] |= out[1:, :-1]
        out = m
    return out


def line_centers(profile, thresh, min_gap=3):
    """Centers of runs where profile > thresh (e.g. grid lines in a dark/gray-fraction profile)."""
    cs = [(a + b - 1) / 2.0 for a, b in runs(profile > thresh)]
    out = []
    for c in cs:
        if out and c - out[-1] < min_gap:
            out[-1] = (out[-1] + c) / 2.0
        else:
            out.append(c)
    return out


# --------------------------------------------------------------------------------------------
# TASK A - portraits
# --------------------------------------------------------------------------------------------
# references/portraits2.jpg: 6x6 grid of framed illustrated portraits (name label under each frame)
ART_IDS = [
    ['president', 'rufus', 'reeve', 'heidegger', 'hojo', 'scarlet'],
    ['verdot', 'tseng', 'reno', 'rude', 'elena', 'sephiroth'],
    ['cloud', 'zack', 'aeris', 'tifa', 'vincent', 'yuffie'],
    ['cid', 'barret', 'redxiii', 'caitsith', 'shalua', 'elfe'],
    # rows 5-6: Before Crisis Turks - skipped
]
# The frames are portrait-shaped (~134x156 inside); we cut a square of the full inner width.
# bias = where the square sits vertically inside the frame (0 = top, 1 = bottom).
ART_BIAS_DEFAULT = 0.3
ART_BIAS = {'cloud': 0.0, 'caitsith': 0.0, 'redxiii': 0.1, 'zack': 0.15}   # keep hair spikes / ears

# references/portraits.jpg: 3 groups x (PS1 model | Remake render) x 9 rows; we take the PS1 faces
PS1_IDS = [
    ['cloud', 'zack', 'aeris', 'tifa', 'barret', 'marlene', 'jessie', 'biggs', 'wedge'],
    ['redxiii', 'sephiroth', 'president', 'rufus', 'hojo', 'heidegger', 'scarlet', 'palmer', 'reeve'],
    ['tseng', 'reno', 'rude', 'corneo', None, None, 'marle', 'elmyra', None],
]
PS1_BIAS = {}          # optional per-id vertical bias for the square (cells are ~square anyway)


def _intervals(lines):
    return [(lines[i], lines[i + 1]) for i in range(len(lines) - 1)]


def _frame_inset(dark, pos, span, axis, direction, max_inset=6):
    """Step inward from a frame line until the line/antialias pixels are gone."""
    a, b = span
    inset = 0
    pos = int(round(pos))
    while inset < max_inset:
        p = pos + direction * inset
        seg = dark[a:b, p] if axis == 'x' else dark[p, a:b]
        if seg.mean() < 0.25:
            break
        inset += 1
    return inset + 1   # one more pixel for the anti-aliased edge


def crop_art_portraits():
    """Illustrated portraits (frames = thin dark lines on white)."""
    src = os.path.join(REF, 'portraits2.jpg')
    im = Image.open(src).convert('RGB')
    g = np.asarray(im.convert('L')).astype(np.int16)
    dark = g < 110
    vlines = line_centers(dark.mean(0), 0.75)
    hlines = line_centers(dark.mean(1), 0.75)

    # frames are the long intervals between consecutive lines; gutters/labels are the short ones
    def frames_from(lines):
        iv = _intervals(lines)
        big = max(b - a for a, b in iv)
        return [(a, b) for a, b in iv if b - a > 0.6 * big]
    cols = frames_from(vlines)
    rows = frames_from(hlines)
    print('  portraits2: %d frame columns, %d frame rows' % (len(cols), len(rows)))
    assert len(cols) == 6 and len(rows) == 6, (cols, rows)
    out = {}
    for r, ids in enumerate(ART_IDS):
        y0l, y1l = rows[r]
        for c, pid in enumerate(ids):
            x0l, x1l = cols[c]
            span_y = (int(y0l) + 4, int(y1l) - 4)
            span_x = (int(x0l) + 4, int(x1l) - 4)
            x0 = int(round(x0l)) + _frame_inset(dark, x0l, span_y, 'x', +1)
            x1 = int(round(x1l)) - _frame_inset(dark, x1l, span_y, 'x', -1) + 1
            y0 = int(round(y0l)) + _frame_inset(dark, y0l, span_x, 'y', +1)
            y1 = int(round(y1l)) - _frame_inset(dark, y1l, span_x, 'y', -1) + 1
            w, h = x1 - x0, y1 - y0
            side = min(w, h)
            bias = ART_BIAS.get(pid, ART_BIAS_DEFAULT)
            sx = x0 + (w - side) // 2
            sy = y0 + int(round((h - side) * bias))
            crop = im.crop((sx, sy, sx + side, sy + side))
            crop = crop.resize((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS)
            path = os.path.join(OUT_PORTRAITS, pid + '.png')
            crop.save(path, optimize=True)
            out[pid] = (path, (sx, sy, side))
    return out


def crop_ps1_portraits():
    """PS1 model faces: grid of thin gray separator lines, black gutters between the 3 groups."""
    src = os.path.join(REF, 'portraits.jpg')
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    g = a.mean(2)
    sat = a.max(2) - a.min(2)
    gray = (g > 90) & (g < 235) & (sat < 30)
    H, W = g.shape
    vlines = line_centers(gray.mean(0), 0.6)
    # content rows = rows crossed by the vertical separators (top/bottom black bands are not)
    vx = [int(round(v)) for v in vlines]
    crossed = gray[:, vx].mean(1) > 0.5
    rr = runs(crossed)
    cy0, cy1 = rr[0][0], rr[-1][1]
    hlines = line_centers(gray[cy0:cy1].mean(1), 0.6)
    hlines = [cy0 - 1.0] + [h + cy0 for h in hlines] + [float(cy1)]
    xs = [-1.0] + vlines + [float(W)]
    iv = _intervals(xs)
    big = max(b - a_ for a_, b in iv)
    # classify intervals: cells (wide) vs gutters (narrow); groups = runs of cells between gutters
    groups, cur = [], []
    for (x0, x1) in iv:
        if x1 - x0 > 0.5 * big:
            cur.append((x0, x1))
        else:
            if cur:
                groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    rows = _intervals(hlines)
    print('  portraits : %d groups %s, %d rows' % (len(groups), [len(gg) for gg in groups], len(rows)))
    assert len(groups) == 3 and all(len(gg) == 2 for gg in groups) and len(rows) == 9, (groups, rows)
    out = {}
    inset = 3
    for gi, ids in enumerate(PS1_IDS):
        x0l, x1l = groups[gi][0]            # left of pair = PS1 model
        for r, pid in enumerate(ids):
            if not pid:
                continue
            y0l, y1l = rows[r]
            x0, x1 = int(round(x0l)) + inset, int(round(x1l)) - inset + 1
            y0, y1 = int(round(y0l)) + inset, int(round(y1l)) - inset + 1
            w, h = x1 - x0, y1 - y0
            side = min(w, h)
            bias = PS1_BIAS.get(pid, 0.5)
            sx = x0 + (w - side) // 2
            sy = y0 + int(round((h - side) * bias))
            crop = im.crop((sx, sy, sx + side, sy + side)).resize((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS)
            path = os.path.join(OUT_PORTRAITS, 'ps1_' + pid + '.png')
            crop.save(path, optimize=True)
            out['ps1_' + pid] = (path, (sx, sy, side))
    return out


def portrait_contact(art, ps1):
    items = list(art.items()) + list(ps1.items())
    cols = 8
    tw, th = PORTRAIT_SIZE, PORTRAIT_SIZE + 18
    pad = 6
    nrows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, nrows * (th + pad) + pad), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    font = load_font(12)
    for i, (key, (path, _)) in enumerate(items):
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + pad)
        sheet.paste(Image.open(path).convert('RGB'), (x, y))
        d.text((x + 2, y + PORTRAIT_SIZE + 2), key, fill=(255, 255, 255), font=font)
    p = os.path.join(OUT_PORTRAITS, '_contact.png')
    sheet.save(p)
    return p


def build_portraits(contact=True):
    ensure_dir(OUT_PORTRAITS)
    art = crop_art_portraits()
    ps1 = crop_ps1_portraits()
    print('  wrote %d illustrated + %d PS1 portraits -> %s' % (len(art), len(ps1), rel(OUT_PORTRAITS)))
    if contact:
        print('  contact sheet:', rel(portrait_contact(art, ps1)))
    return art, ps1


# --------------------------------------------------------------------------------------------
# TASK B - battle effect sheets
# --------------------------------------------------------------------------------------------
def list_fx_sources():
    """[(key, folder, stem, path)] for every effect sheet. PNG preferred; a BMP is used only when
    no PNG with the same stem exists in the folder."""
    out = []
    for folder in sorted(os.listdir(FX_SRC)):
        d = os.path.join(FX_SRC, folder)
        if folder == MISC_DIR or not os.path.isdir(d):
            continue
        files = sorted(os.listdir(d))
        stems_png = {os.path.splitext(f)[0].lower() for f in files if f.lower().endswith('.png')}
        for f in files:
            stem, ext = os.path.splitext(f)
            ext = ext.lower()
            if ext == '.png' or (ext == '.bmp' and stem.lower() not in stems_png):
                out.append((folder + '/' + stem, folder, stem, os.path.join(d, f)))
    return out


def to_alpha(rgb):
    """Black-background additive sheet -> straight-alpha RGBA.
    alpha = max(R,G,B)^gamma ; RGB = RGB / alpha, so that RGBA drawn over black == original."""
    rgbf = rgb.astype(np.float32)
    m = rgbf.max(axis=2) / 255.0
    a = np.power(m, ALPHA_GAMMA)
    safe = np.where(a > 0, a, 1.0)
    col = np.clip(np.rint(rgbf / safe[..., None]), 0, 255)
    a8 = np.clip(np.rint(a * 255.0), 0, 255)
    col[a8 == 0] = 0
    return np.dstack([col, a8]).astype(np.uint8)


def _boxes_from_mask(mask, dil=2):
    lab, n = label(dilate(mask, dil))
    boxes = []
    if n == 0:
        return boxes
    objs = _ndi.find_objects(lab) if _ndi is not None else None
    for i in range(1, n + 1):
        if objs is not None:
            sl = objs[i - 1]
            if sl is None:
                continue
            sub = (lab[sl] == i) & mask[sl]
            oy, ox = sl[0].start, sl[1].start
        else:
            ys, xs = np.nonzero(lab == i)
            oy, ox = ys.min(), xs.min()
            sub = (lab[oy:ys.max() + 1, ox:xs.max() + 1] == i) & mask[oy:ys.max() + 1, ox:xs.max() + 1]
        px = int(sub.sum())
        if px == 0:
            continue
        rr = np.nonzero(sub.any(1))[0]
        cc = np.nonzero(sub.any(0))[0]
        boxes.append([ox + int(cc[0]), oy + int(rr[0]), int(cc[-1] - cc[0] + 1), int(rr[-1] - rr[0] + 1), px])
    return boxes


def _inter(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    return max(0, x1 - x0) * max(0, y1 - y0)


def _merge_overlapping(boxes, frac=0.3):
    boxes = [list(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                it = _inter(a, b)
                if it and it >= frac * min(a[2] * a[3], b[2] * b[3]):
                    x0, y0 = min(a[0], b[0]), min(a[1], b[1])
                    x1, y1 = max(a[0] + a[2], b[0] + b[2]), max(a[1] + a[3], b[1] + b[3])
                    boxes[i] = [x0, y0, x1 - x0, y1 - y0, a[4] + b[4]]
                    del boxes[j]
                    changed = True
                    break
            if changed:
                break
    return boxes


def _reading_order(boxes):
    """Row bands top->bottom (a box joins a band when it overlaps it vertically by >=50% of the
    smaller height), then left->right inside each band."""
    bands = []
    for b in sorted(boxes, key=lambda b: (b[1], b[0])):
        placed = False
        for band in bands:
            ov = min(band[1], b[1] + b[3]) - max(band[0], b[1])
            if ov >= 0.5 * min(b[3], band[1] - band[0]):
                band[0], band[1] = min(band[0], b[1]), max(band[1], b[1] + b[3])
                band[2].append(b)
                placed = True
                break
        if not placed:
            bands.append([b[1], b[1] + b[3], [b]])
    bands.sort(key=lambda bd: bd[0])
    out = []
    for band in bands:
        out.extend(sorted(band[2], key=lambda b: b[0]))
    return out

PAGE = 256             # PS1 texture page width; sheets are usually 1-4 pages side by side
GRID_CAND = [16, 24, 32, 40, 48, 60, 64, 80, 96, 128, 160, 192, 256]


def key_flat_background(rgb):
    """Some pages have a flat dark non-black fill (a CLUT colour such as (24,24,24)) behind the
    sprites. Treat that exact colour as black when it covers >=25% of a 256-px page."""
    H, W = rgb.shape[:2]
    out, keyed = rgb, 0
    for x0 in range(0, W, PAGE):
        page = rgb[:, x0:x0 + PAGE]
        packed = (page[..., 0].astype(np.int32) << 16) | (page[..., 1].astype(np.int32) << 8) | page[..., 2]
        vals, counts = np.unique(packed, return_counts=True)
        i = int(counts.argmax())
        v = int(vals[i])
        if v and counts[i] >= 0.25 * packed.size and max(v >> 16, (v >> 8) & 255, v & 255) <= 64:
            if out is rgb:
                out = rgb.copy()
            out[:, x0:x0 + PAGE][packed == v] = 0
            keyed += 1
    return out, keyed


def split_pages(m):
    """Split at multiples of 256 px (PS1 texture pages: one polygon cannot sample across two
    pages) unless the picture is clearly continuous across the boundary (one wide texture):
    per-pixel difference across the seam ~ the difference between neighbouring columns on
    either side, and no jump in the column-mean brightness."""
    H, W = m.shape
    lit = m > LIT_T
    mf = m.astype(np.float32)
    cm = mf.mean(0)
    cuts = [0]
    for x in range(PAGE, W, PAGE):
        both = (lit[:, x - 1] & lit[:, x]).mean()
        if both > 0.3 and 8 <= x <= W - 9:
            d_b = np.abs(mf[:, x - 1] - mf[:, x]).mean()
            d_in = 0.5 * (np.abs(mf[:, x - 2] - mf[:, x - 1]).mean() + np.abs(mf[:, x] - mf[:, x + 1]).mean()) + 1.0
            local = np.abs(np.diff(np.r_[cm[x - 8:x], cm[x:x + 8]])).tolist()
            del local[7]                       # the seam itself
            jump = abs(cm[x - 1] - cm[x]) / (float(np.median(local)) + 1.0)
            if d_b / d_in < 1.3 and jump < 3.0:
                continue                       # continuous texture: keep the pages together
        cuts.append(x)
    cuts.append(W)
    return [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1)]


def _significant(boxes):
    if not boxes:
        return []
    big = max(b[2] * b[3] for b in boxes)
    sig = [b for b in boxes if b[4] >= 12 and not (b[2] * b[3] < 0.01 * big and b[4] < 60)
           and not (min(b[2], b[3]) <= 3 and max(b[2], b[3]) >= 24)]    # 1-3 px edge lines = junk
    if not sig:
        sig = [max(boxes, key=lambda b: b[4])]
    return _merge_overlapping(sig, 0.3)


def _page_grid(m, mask, boxes, T, only=None):
    """Regular grid inside one page: every cell boundary must be a dark valley in the column/row
    brightness profile, >=2 cells lit, sprites fill their cells (median extent >= 40%) and hold
    ~one sprite each. The smallest qualifying cell wins. Returns (cw, ch, cells) or None.
    only=(cw,ch): test just that cell size with relaxed fill/occupancy limits (used to extend a
    grid found on one page of a sheet to its sibling pages)."""
    H, W = m.shape
    E = np.clip(m.astype(np.float32) - T, 0, None)
    Px, Py = E.mean(0), E.mean(1)
    mx, my = float(Px.mean()), float(Py.mean())
    if mx <= 0:
        return None
    Hp = H + 1 if H % 16 == 15 else H          # 255-high sheets behave like 256

    def valleys(P, mean, size, n):
        for k in range(1, n):
            b = k * size
            if b >= len(P) or min(P[b - 1], P[b]) > 0.12 * mean:
                return False
        return True
    cws = [c for c in GRID_CAND if c <= W and W % c == 0 and valleys(Px, mx, c, W // c)]
    chs = [c for c in GRID_CAND if c <= Hp and Hp % c == 0 and valleys(Py, my, c, Hp // c)]
    cand = sorted(((cw, ch) for cw in cws for ch in chs if not (cw == W and ch >= Hp)),
                  key=lambda t: (t[0] * t[1], abs(t[0] - t[1])))
    min_fill, max_occ = 0.4, 1.6
    if only:
        cand = [only] if only in cand else []
        min_fill, max_occ = 0.25, 3.0
    for cw, ch in cand:
        cells, fill, occ = [], [], []
        for gy in range(Hp // ch):
            for gx in range(W // cw):
                x0, y0 = gx * cw, gy * ch
                sub = mask[y0:min(H, y0 + ch), x0:x0 + cw]
                if sub.sum() < 4:
                    continue
                rr = np.nonzero(sub.any(1))[0]
                cc = np.nonzero(sub.any(0))[0]
                if rr[-1] - rr[0] < 2 or cc[-1] - cc[0] < 2:      # 1-2 px lines = edge junk
                    continue
                fill.append(max((cc[-1] - cc[0] + 1) / cw, (rr[-1] - rr[0] + 1) / ch))
                occ.append(sum(1 for b in boxes
                               if x0 <= b[0] + b[2] / 2 < x0 + cw and y0 <= b[1] + b[3] / 2 < y0 + ch))
                cells.append([x0, y0, cw, min(ch, H - y0)])
        if len(cells) < (1 if only else 2) or float(np.median(fill)) < min_fill or float(np.mean(occ)) > max_occ:
            continue
        return cw, ch, cells
    return None


def detect_frames(m):
    """m: HxW max-channel image. Returns (frames, grid, groups, static).
    frames: [[x,y,w,h]] in source px, page by page (left->right), reading order inside a page.
    groups: [[first_frame, count, cw, ch]] one per page/region (cw=ch=0: free-form boxes)."""
    H, W = m.shape
    pages = []
    for (x0, x1) in split_pages(m):
        sub = m[:, x0:x1]
        T = LIT_T
        p30 = float(np.percentile(sub, 30))
        if p30 > LIT_T:                       # hazy page: raise the threshold above the haze
            T = int(p30) + 8
        mask = sub > T
        if mask.sum() < 12:
            continue
        boxes = _significant(_boxes_from_mask(mask, dil=2))
        pages.append([x0, x1, sub, mask, boxes, T, _page_grid(sub, mask, boxes, T)])
    # a grid found on one page is retried (relaxed) on the sheet's other pages
    sizes = []
    for pg in pages:
        if pg[6] and pg[6][:2] not in sizes:
            sizes.append(pg[6][:2])
    for pg in pages:
        if not pg[6]:
            for sz in sizes:
                g = _page_grid(pg[2], pg[3], pg[4], pg[5], only=sz)
                if g:
                    pg[6] = g
                    break
    frames, groups = [], []
    tex_groups = 0
    for (x0, x1, sub, mask, boxes, T, g) in pages:
        start = len(frames)
        if g:
            cw, ch, cells = g
            frames.extend([[c[0] + x0, c[1], c[2], c[3]] for c in cells])
            groups.append([start, len(cells), cw, ch])
        else:
            pw = x1 - x0
            for (bx, by, bw, bh, _) in _reading_order(boxes):
                ax0, ay0 = max(0, bx - 1), max(0, by - 1)            # 1px pad for faint halos
                ax1, ay1 = min(pw, bx + bw + 1), min(H, by + bh + 1)
                frames.append([ax0 + x0, ay0, ax1 - ax0, ay1 - ay0])
            groups.append([start, len(frames) - start, 0, 0])
            if len(boxes) == 1 and (boxes[0][2] * boxes[0][3] >= 0.5 * pw * H or
                                    (boxes[0][2] >= 192 and boxes[0][3] >= 192)):
                tex_groups += 1
    grid = None
    if groups and all(gr[2] for gr in groups) and len({(gr[2], gr[3]) for gr in groups}) == 1:
        grid = [groups[0][2], groups[0][3]]
    static = len(frames) <= 1 or tex_groups == len(groups)
    return frames, grid, groups, static


# sheets whose cells touch (no dark gutters) so detection cannot split them: key -> (cw, ch, count)
GRID_OVERRIDE = {
    'DICE_0000/DISE_0000': (64, 64, 6),     # dice faces 1..6 (white faces, red pips)
    'DICE_0000/DISE_0001': (64, 64, 6),     # dice faces 1..6 (black pips)
}


def _alpha_stamp():
    return 'gamma=%s;key=1' % ALPHA_GAMMA


def process_fx(only=None):
    srcs = list_fx_sources()
    if only:
        srcs = [s for s in srcs if re.search(only, s[0])]
    print('  %d effect sheets' % len(srcs))
    stamp_path = os.path.join(OUT_FX, '.alpha_stamp')
    stamp_ok = os.path.exists(stamp_path) and open(stamp_path).read() == _alpha_stamp()
    atlas, keyed_total, written = {}, 0, 0
    for i, (key, folder, stem, path) in enumerate(srcs):
        rgb = np.asarray(Image.open(path).convert('RGB'))
        rgb, keyed = key_flat_background(rgb)
        keyed_total += bool(keyed)
        H, W = rgb.shape[:2]
        out_dir = os.path.join(OUT_FX, folder)
        ensure_dir(out_dir)
        out_path = os.path.join(out_dir, stem + '.png')
        if not (stamp_ok and os.path.exists(out_path) and os.path.getmtime(out_path) >= os.path.getmtime(path)):
            Image.fromarray(to_alpha(rgb), 'RGBA').save(out_path, optimize=True)
            written += 1
        m = rgb.max(axis=2)
        lit = m > LIT_T
        lum = float(m[lit].mean() / 255.0) if lit.any() else 0.0
        frames, grid, groups, static = detect_frames(m)
        sizes = sorted((f[2], f[3]) for f in frames)
        # white-background sheets are mask / alternate-CLUT dumps, not usable as additive sprites
        # (any 256-px page whose dominant colour is ~white over >= 50% of it)
        inv = False
        for x0 in range(0, W, PAGE):
            pg = rgb[:, x0:x0 + PAGE]
            if pg.shape[1] < 128:
                continue
            packed = (pg[..., 0].astype(np.int32) << 16) | (pg[..., 1].astype(np.int32) << 8) | pg[..., 2]
            vals, counts = np.unique(packed, return_counts=True)
            top = int(vals[counts.argmax()])
            if min(top >> 16, (top >> 8) & 255, top & 255) >= 230 and counts.max() >= 0.5 * packed.size:
                inv = True
        if key in GRID_OVERRIDE:
            cw, ch, n = GRID_OVERRIDE[key]
            frames = [[(i % (W // cw)) * cw, (i // (W // cw)) * ch, cw, ch] for i in range(n)]
            grid, groups, static, inv = [cw, ch], [[0, n, cw, ch]], False, False
            sizes = [(cw, ch)]
        # coarse lit-mask signature (8px blocks) used to spot palette variants of the same layout
        hb, wb = H // 8, W // 8
        sig = lit[:hb * 8, :wb * 8].reshape(hb, 8, wb, 8).any(axis=(1, 3))
        blk = m[:hb * 8, :wb * 8].astype(np.float32).reshape(hb, 8, wb, 8).mean(axis=(1, 3)).ravel()
        blk = blk - blk.mean()
        blk = blk / (np.sqrt((blk * blk).sum()) + 1e-6)
        atlas[key] = {
            'src': rel(out_path), 'w': W, 'h': H, 'frames': frames, 'grid': grid,
            'lum': round(lum, 2), 'groups': groups, 'static': static or inv, 'inv': inv,
            'cover': round(float(lit.mean()), 3), 'keyed': keyed,
            'typ': list(sizes[len(sizes) // 2]) if sizes else [0, 0], '_sig': sig, '_blk': blk,
        }
        if (i + 1) % 100 == 0:
            print('   ...%d' % (i + 1))
    if not only:
        with open(stamp_path, 'w') as f:
            f.write(_alpha_stamp())
    print('  wrote %d alpha PNGs (%d up to date), %d sheets had a flat background keyed out'
          % (written, len(srcs) - written, keyed_total))
    # palette variants: same folder, same size, near-identical lit layout as an earlier sheet
    by_folder = {}
    for k in sorted(atlas):
        e = atlas[k]
        e['variant_of'] = None
        for k0 in by_folder.get(k.split('/')[0], []):
            e0 = atlas[k0]
            if (e0['w'], e0['h']) != (e['w'], e['h']) or e['inv'] or e0['inv']:
                continue
            a, b = e['_sig'], e0['_sig']
            union = (a | b).sum()
            iou = (a & b).sum() / union if union else 0.0
            corr = float((e['_blk'] * e0['_blk']).sum())      # correlation of 8px block brightness
            if iou >= 0.85 or corr >= 0.8:
                e['variant_of'] = e0['variant_of'] or k0
                break
        by_folder.setdefault(k.split('/')[0], []).append(k)
    for e in atlas.values():
        del e['_sig'], e['_blk']
    return atlas


GROUP_COLS = [(80, 220, 120), (240, 180, 60), (90, 170, 255), (255, 110, 200)]


def fx_contact_sheets(atlas, per_page=20, cols=4, tw=300, th=150, prefix='_contact_'):
    """Contact sheets of the alpha sheets over dark gray, detected frames outlined
    (green = grid cells, other colours = free-form boxes, one colour per page/region)."""
    keys = sorted(atlas)
    font = load_font(12)
    small = load_font(10)
    pad, lab = 6, 28
    pages = []
    for p in range(0, len(keys), per_page):
        chunk = keys[p:p + per_page]
        nrows = (len(chunk) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * (tw + pad) + pad, nrows * (th + lab + pad) + pad), (24, 24, 28))
        d = ImageDraw.Draw(sheet)
        for i, k in enumerate(chunk):
            e = atlas[k]
            x = pad + (i % cols) * (tw + pad)
            y = pad + (i // cols) * (th + lab + pad)
            im = Image.open(os.path.join(ROOT, e['src'])).convert('RGBA')
            s = min(tw / e['w'], th / e['h'])
            nw, nh = max(1, int(e['w'] * s)), max(1, int(e['h'] * s))
            bg = Image.new('RGBA', (nw, nh), (48, 48, 56, 255))
            bg.alpha_composite(im.resize((nw, nh), Image.LANCZOS))
            sheet.paste(bg.convert('RGB'), (x, y))
            for gi, (start, n, cw, ch) in enumerate(e['groups']):
                col = GROUP_COLS[0] if cw else GROUP_COLS[1 + gi % 3]
                for (fx, fy, fw, fh) in e['frames'][start:start + n]:
                    x0_, y0_ = x + fx * s, y + fy * s
                    d.rectangle([x0_, y0_, max(x0_, x + (fx + fw) * s - 1), max(y0_, y + (fy + fh) * s - 1)],
                                outline=col)
            d.text((x, y + nh + 2), k, fill=(255, 255, 255), font=font)
            info = '%dx%d  %d fr%s  lum %.2f%s' % (
                e['w'], e['h'], len(e['frames']), '  grid %dx%d' % tuple(e['grid']) if e['grid'] else '',
                e['lum'], '  STATIC' if e['static'] else '')
            d.text((x, y + nh + 15), info, fill=(170, 170, 180), font=small)
        path = os.path.join(OUT_FX, '%s%02d.png' % (prefix, p // per_page + 1))
        sheet.save(path)
        pages.append((path, chunk))
    return pages


def write_atlas_js(atlas):
    lines = ['// generated by tools/build_assets.py — do not edit',
             '// FF7 PS1 battle-effect texture sheets (alpha = max(R,G,B)); frames are [x,y,w,h] in source px.',
             '// grid: [cw,ch] when the whole sheet is one regular grid. groups: [[firstFrame,count,cw,ch]] per',
             '// texture page/region (cw=0: free-form boxes, draw centred). static: single texture, not an animation.',
             '// inv: white-background mask/alt-CLUT dump (not usable as an additive sprite).',
             '// lum: mean brightness of lit pixels (0-1). See docs/fx_atlas.md for what each sheet is.',
             'Object.assign(FF7.data.fxAtlas, {']
    for k in sorted(atlas):
        e = atlas[k]
        parts = ['src: %s' % json.dumps(e['src']), 'w: %d' % e['w'], 'h: %d' % e['h'],
                 'frames: %s' % json.dumps(e['frames'], separators=(',', ':')),
                 'grid: %s' % (json.dumps(e['grid'], separators=(',', ':')) if e['grid'] else 'null'),
                 'lum: %s' % e['lum']]
        if len(e['groups']) > 1:
            parts.append('groups: %s' % json.dumps(e['groups'], separators=(',', ':')))
        if e['static']:
            parts.append('static: true')
        if e['inv']:
            parts.append('inv: true')
        lines.append('  %s: { %s },' % (json.dumps(k).replace('"', "'"), ', '.join(parts)))
    lines.append('});')
    ensure_dir(os.path.dirname(OUT_ATLAS_JS))
    with open(OUT_ATLAS_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    return OUT_ATLAS_JS


# --------------------------------------------------------------------------------------------
# effect identification (folder names are FF7's internal Japanese-romanised effect names)
# confidence: no mark = confident, '?' = educated guess, '??' = unknown / pure description
# --------------------------------------------------------------------------------------------
M, ES, SU, LB, EN, IT, BO = 'Magic', 'Enemy Skill', 'Summon', 'Limit', 'Enemy', 'Item', 'Boss'
FOLDER_INFO = {
    'ALEX_0000': (SU, 'Alexander — Judgement: smoke/fire puffs'),
    'ALEX_0001': (SU, 'Alexander — flame column texture'),
    'ALTEMA': (M, 'Ultima (アルテマ) — green energy texture (BMP duplicate of the PNG)'),
    'ANGERMAX_0000': (LB, 'Barret — Ungarmax (アンガーマックス): muzzle flashes'),
    'ANTLION_0000': (EN, 'Antlion (sand pit enemy) — swirling sand texture'),
    'AQUA_0000': (ES, 'Aqualung — water sphere texture'),
    'ATOMIC_0000': (EN, '?? "Atomic" beam — wavy lightning columns + particle bursts (12 colour sets)'),
    'AWA_0000': (EN, 'Bubbles (泡 awa) — whirlpool + bubbles'),
    'AYASII_0000': (EN, '?? 怪しい ("suspicious") — purple mist puff (strange-dance / status attack?)'),
    'BACUME_0000': (EN, '? Vacuum (バキューム) — concentric cyan ring, 15 animation steps (one per sheet)'),
    'BEAM_0000': (EN, 'Beam impact — energy blobs + blue orb'),
    'BEAST_0000': (LB, 'Vincent — Beast Flare (Galian Beast): golden swirl sphere'),
    'BEATA_0000': (ES, '? Beta (ベータ) — red/blue fire swirl sphere'),
    'BEAT_0000': (LB, 'Tifa — Beat Rush: star sparkles'),
    'BERSERK_0000': (M, 'Berserk — flame bands, glow dots, cracks'),
    'BIOGA1_0000': (M, 'Bio3 (バイオガ) part 1 — poison blobs + green mist'),
    'BIOGA2_0000': (M, 'Bio3 part 2 — poison blobs'),
    'BIOGA2_0001': (M, 'Bio3 — green mist texture'),
    'BIORA_0000': (M, 'Bio2 (バイオラ) — poison blobs'),
    'BIO_0000': (M, 'Bio — poison blobs/bubbles'),
    'BLASTER_0000': (EN, 'Blaster (enemy) — fire textures, flame bursts, ring'),
    'BLAVER_0000': (LB, 'Cloud — Braver (ブレイバー): slash arcs + star glints'),
    'BOOST_0000': (LB, 'Cid — Boost Jump: dust puffs + impact star'),
    'BRAND_0000': (LB, 'Aeris — Fury Brand (怒りの烙印): lightning'),
    'BREAK_0000': (M, 'Break — stone textures + ring'),
    'BRIZAG2_0000': (M, 'Ice3 (ブリザガ) part 2 — ice bands, rings, shards, ice texture'),
    'BRIZAG_0000': (M, 'Ice3 (ブリザガ) — ice gradient bands + flare'),
    'BRIZARA_0000': (M, 'Ice2 (ブリザラ) — blue ice gradient bands'),
    'BUSHIN2_0000': (LB, 'Cloud — Omnislash (超究武神覇斬) part 2: bursts, flames, energy'),
    'CATASTRO_0000': (LB, 'Barret — Catastrophe: explosions + radial burst'),
    'CBREATH_0000': (ES, '? Cold Breath — swirl + frost puffs'),
    'CHIKASUI_0000': (EN, '?? 地下水 ("groundwater") — small water sphere texture'),
    'CHI_0000': (LB, 'Yuffie — Bloodfest (血祭): red/purple slashes'),
    'CHOCO0_0000': (SU, 'Choco/Mog — "Choco Kick" dust + stars + swirls'),
    'CHOCO0_0001': (SU, 'Choco/Mog — 必殺技 ("deathblow") banner + Mog/Chocobo bits'),
    'CHO_KYU_0000': (LB, 'Cloud — Omnislash (超究武神覇斬): glow, swirl, particles'),
    'CLIMB_0000': (LB, 'Cloud — Climhazzard: glow ball + star flashes'),
    'CLUB1_0000': (EN, 'Card attack "Club" — card face + ground texture'),
    'CLUB2_0000': (EN, 'Card attack "Club" part 2 — animated textures + bars'),
    'COMET_0000': (M, 'Comet — crater texture, flaming meteor, planet'),
    'CONF_0000': (M, 'Confu — puffs + star'),
    'COSMO_0000': (LB, 'Red XIII — Cosmo Memory: fire textures + swirl'),
    'DAICHI_0000': (LB, 'Aeris — Breath of the Earth (大地の息吹): sparkles + light pillar'),
    'DAIONPA_0000': (EN, '?? 大音波 ("great sound wave") — rings, orbs, wavy columns'),
    'DAISENP_0000': (EN, '? 大旋風 ("great whirlwind") — white dust puff'),
    'DEATH_0001': (M, 'Death — 死 ("death") kanji box'),
    'DEBUCHO_0000': (SU, 'Choco/Mog — Fat Chocobo (デブチョコボ) landing dust'),
    'DEJON_0000': (M, 'Remove (デジョン) — star field, dimension swirl'),
    'DETHFO_0000': (ES, 'Death Force — crystal sphere'),
    'DETHPER': (EN, '?? "DETHPER" — purple/white wavy texture'),
    'DIA1_0000': (EN, 'Card attack "Diamond" — crown/VII emblems, cards'),
    'DIA2_0000': (EN, 'Card attack "Diamond" part 2 — medallion with kanji'),
    'DIA_0000': (EN, 'Card attack "Diamond" — flash + fire bursts'),
    'DICE_0000': (LB, 'Cait Sith — Dice: dice faces 1-6'),
    'DIVE_0000': (LB, 'Cid — Dragon Dive: blue energy texture'),
    'DOKUEKI_0000': (EN, '毒液 poison fluid — green / amber splashes'),
    'DOKUFUKI_0000': (EN, '毒吹き poison spray — spray puffs'),
    'DRAGONN_0000': (LB, 'Cid — Dragon: green radial burst'),
    'DYNAMITE_0000': (LB, 'Cid — Dynamite: explosion'),
    'ECHOES_0000': (EN, '?? "Echoes" — white smoke puffs'),
    'ELECBALL_0000': (EN, 'Electric ball — crackle + glow ball'),
    'ENERGY_0000': (EN, 'Energy — radial burst, swirl, particles'),
    'ERAVE_0000': (LB, 'Red XIII — Earth Rave: swirl + streaks'),
    'ESNA_0000': (M, 'Esuna — green lens flare'),
    'FAIGA2_0000': (M, 'Fire3 (ファイガ) — green fire sphere texture'),
    'FAIGA_0000': (M, 'Fire3 (ファイガ) — fire swirl sphere + glow balls'),
    'FAIRA_0000': (M, 'Fire2 (ファイラ) — flame wall strips'),
    'FIRE_0000': (M, 'Fire (ファイア) — flame burst animation (13 frames)'),
    'FLAME_0000': (EN, 'Flame — flame burst animation (enemy fire attack)'),
    'FLEA_0000': (M, 'Flare (フレア) — red swirl + fireballs'),
    'FREEZE_0000': (M, 'Freeze — ice cliff + frost textures'),
    'FROG_0000': (M, 'Toad — sparkles + puff'),
    'FUBUKI_0000': (EN, '吹雪 blizzard — snow texture + swirl'),
    'FULLSCAPE_0000': (M, 'Full Cure (フルケア) — light curtain texture'),
    'GAISEI_0000': (EN, '?? GAISEI — flame columns + dust puffs'),
    'GAISHU_0000': (LB, '? Yuffie — Doom of the Living (鎧袖一触): blue flame texture'),
    'GARYU_0000': (LB, 'Cloud — Finishing Touch (画竜点睛): rock + ground textures'),
    'GAS_0000': (EN, 'Gas — gas clouds + puffs'),
    'GEKI1_0000': (EN, '?? GEKI — spray + puffs; GEKI2_*: ground rip + branching cracks'),
    'GESUI_0000': (EN, '下水 sewage water — cell texture + splashes'),
    'GOBLINP_0000': (ES, 'Goblin Punch — hit puff + radial flash'),
    'GOSPEL_0000': (LB, 'Aeris — Great Gospel: cloud texture + sparkles'),
    'GRAVIDE_0000': (M, 'Demi (グラビデ) — dark wisps + sphere'),
    'GRAVIGA1_0000': (M, 'Demi3 (グラビガ) — dark wisps + sphere'),
    'GRAVIGA2_0000': (M, 'Demi3 (グラビガ) part 2 — wisps + texture'),
    'GRAVIRA_0000': (M, 'Demi2 (グラビラ) — dark wisps + sphere'),
    'GRENADE_0000': (LB, 'Grenade / Barret Grenade Bomb — explosion ring + ground texture'),
    'HADES_0000': (SU, 'Hades — cauldron smoke, bubbles, ground'),
    'HADOHO_0000': (EN, '波動砲 wave-motion cannon — glow, rings, particles'),
    'HADO_0000': (EN, '波動 wave — radial flash, swirl, particles'),
    'HAKAI_0000': (EN, '?? 破壊 ("destruction") — blue electric squiggles'),
    'HAKOU_0000': (LB, 'Cloud — Blade Beam (破晄撃): beam columns + ring'),
    'HAKUGEK1_0000': (EN, '? 爆撃 bombardment — ground texture + debris'),
    'HARI1000_0000': (ES, '1000 Needles (針千本) — needle bursts'),
    'HARRIER_0000': (EN, '?? Harrier — coloured bursts + streaks'),
    'HATENA_0000': (ES, '???? (はてな) — dark puffs + "?" glyph'),
    'HEART1_0000': (EN, 'Card attack "Heart" — card face'),
    'HEART2_0000': (EN, 'Card attack "Heart" part 2 — ray burst, cards'),
    'HEATBU_0000': (EN, '? heat blast — molten fire sphere'),
    'HEIST_0000': (M, 'Haste (ヘイスト) — clock face + band texture'),
    'HIKARI2_0000': (M, '光 light — blue flare + sparkle ring'),
    'HIKARI3_0000': (M, '光 light — orange flare + sparkle ring'),
    'HIKARI_0000': (M, '光 light — gold flare'),
    'HIKARI_0001': (M, '光 light — gold sparkle ring'),
    'HIWIND_0000': (LB, 'Cid — Highwind: explosions, missiles'),
    'HMOON_0000': (LB, 'Red XIII — Howling Moon: moon texture + swirl'),
    'HO_DEN_0000': (EN, '放電 electric discharge (Live Wire?) — streaks + cracks'),
    'HVSHOT_0000': (LB, 'Barret — Big Shot (ヘヴィショット): energy swirl + cone'),
    'HYPER_0000': (LB, 'Cid — Hyper Jump: debris + swirl'),
    'H_BLOW_0000': (LB, 'Barret — Hammerblow: purple tornado'),
    'IFLEET_0000': (SU, 'Ifrit — Hellfire: flames, fire strips, fire sphere'),
    'ITO_0000': (EN, '糸 thread — spider-web strands / blur puff'),
    'IYASHI_0000': (LB, 'Aeris — Healing Wind (いやしの風): sparkle flares (also good for Cure)'),
    'JAKI_0000': (EN, '邪気 evil aura — purple glow'),
    'JAMMER_0000': (EN, '?? Jammer — coloured rings + puffs (18 colour variants)'),
    'JIBAKU1_0000': (EN, '自爆 self-destruct — explosion'),
    'JIBAKU2_0000': (EN, '自爆 self-destruct part 2 — explosion bits'),
    'JIBASIRI_0000': (LB, 'Yuffie — Landscaper (地走り): ground rip'),
    'JINRAI_0000': (LB, 'Yuffie — Greased Lightning (疾風迅雷): slash arcs'),
    'JOKER_0000': (EN, 'Card attack "Joker" — card faces + small cards'),
    'KAEN_0000': (ES, 'Flamethrower (火炎放射) — flame strips + fire bursts'),
    'KAERU_0000': (ES, 'Frog Song (かえるの歌) — puffs + music note'),
    'KAFUN_0000': (EN, '花粉 pollen — pollen cloud + swirl'),
    'KAKUSAN_0000': (EN, '拡散 diffusion beam — beam segments + orbs'),
    'KAMA2_0000': (EN, '鎌 sickle slash part 2'),
    'KAMA_0000': (EN, '鎌 sickle slash — slash lines + burst'),
    'KIEN_0000': (EN, '?? KIEN — slash lines + burst'),
    'KINZAN_0000': (IT, 'Coin / gil — gold koban coins'),
    'KNIGHTS_0000': (SU, 'Knights of the Round — blue energy texture'),
    'KONA_0000': (EN, '粉 powder — pink powder puffs'),
    'KONOHA_0000': (EN, '木の葉 leaves — leaf sprites'),
    'KOROSI_0000': (EN, '?? 殺し ("kill") — red texture with creature'),
    'KOUDAN1_0000': (EN, '光弾 light bullets — glowing orbs, rings, arcs'),
    'KUJATA_0000': (SU, 'Kujata — Tetra-Disaster: wavy flames, fire balls, lava'),
    'KYOGIRI_0000': (LB, 'Cloud — Cross-Slash (凶斬り): slash strokes'),
    'LAMBOSS_0000': (BO, 'Last boss (Safer·Sephiroth) — attack textures'),
    'LAMU_0000': (SU, 'Ramuh — Judgement Bolt: lightning strands + textures'),
    'LASBOSS2_0000': (BO, 'Supernova (Safer·Sephiroth) — planets, galaxy'),
    'LASER2_0000': (EN, 'Laser shot (enemy) — cyan bolt'),
    'LASER_0000': (ES, 'Laser — beam segments + sparks'),
    'LUNATIC_0000': (LB, 'Red XIII — Lunatic High: aura bands + swirls'),
    'LV5DETH_0000': (ES, 'L5 Death — reaper image'),
    'MAGEND_0000': (EN, '?? MAGEND — soft white glow'),
    'MAGIKAL_0000': (ES, '? Magic Breath / "magical" — multicolour orb'),
    'MAGMA_0000': (EN, 'Magma — sun/lava orb'),
    'MEIKYO_0000': (LB, 'Yuffie — Clear Tranquil (明鏡止水): water texture'),
    'MGBEAM_0000': (EN, '?? MG beam — blue burst strip'),
    'MINIMAM_0000': (M, 'Mini (ミニマム) — green puffs'),
    'MISSILE_0000': (EN, 'Missile (Matra Magic?) — missiles, trails, explosions'),
    'MIZUFUKI_0000': (EN, '水吹き water spray — splashes'),
    'MIZU_0000': (EN, '水 water — water streaks + splashes'),
    'MOD_0000': (EN, '?? MOD — small bar glyphs'),
    'MRAIN_0000': (LB, 'Cloud — Meteorain: meteor, fire texture, clouds'),
    'MYTYG_0000': (ES, 'Mighty Guard — shield orb'),
    'M_BREAK_0000': (LB, '? Barret — Mindblow: blue swirl + star bursts'),
    'NADARE_0000': (EN, '雪崩 avalanche — snow textures + puffs'),
    'NANNTOKA_0000': (EN, '?? なんとか ("something") — star field + crater'),
    'NAPALM_0000': (EN, 'Napalm — fire swirl, flames, bursts'),
    'NETSU_0000': (EN, '熱 heat — heat haze textures'),
    'NIGHT_0000': (LB, '? Vincent — Nightmare (Hellmasker): storm clouds + ghost faces'),
    'NONOSHI_0000': (EN, '?? NONOSHI — fire ring + sparks'),
    'NORTHERN_0000': (EN, 'Northern Cross (enemy) — bursts, swirl, star'),
    'ODIN1_0000': (SU, 'Odin — Steel-bladed Sword / Gunge Lance: smoke, ground'),
    'OIL_0000': (EN, 'Oil / Molotov — fire strips + flames'),
    'ONSEN_0000': (EN, '?? 温泉 ("hot spring") — green water orb'),
    'OSEN_0000': (EN, '? 汚染 pollution (Bad Breath?) — smoke textures'),
    'OTSUNAMI_0000': (EN, '大津波 tidal wave — water surface + splashes'),
    'PHOENIX_0000': (SU, 'Phoenix — flame textures + embers'),
    'PINK_0000': (EN, '?? PINK — pink/orange swirl + blobs'),
    'QUASAR_0000': (EN, 'Quasar (enemy) — energy textures + bars'),
    'QUEIG_0000': (M, 'Quake3 (クエイガ) — rock/ground textures + glow'),
    'QUEIK_0000': (M, 'Quake (クエイク) — ground texture'),
    'QUEIR_0000': (M, 'Quake2 (クエイラ) — ground textures + glow'),
    'Q_KETSU_0000': (M, 'Drain (吸血 kyūketsu) — red concentric ring, 19 animation steps'),
    'Q_SHU_0000': (M, 'Absorb / MP drain (吸収 kyūshū) — blue concentric ring, 19 steps'),
    'RAISE_0000': (M, 'Life (レイズ) — rising flame glow + eye/ring'),
    'RAKUSEKI_0000': (EN, '落石 rockfall — rock texture + dust'),
    'REAZER_0000': (EN, '?? REAZER — gold crescent flash'),
    'REITO_0000': (EN, '? 冷凍 freeze (Ice?) — frost texture, ice puffs'),
    'RENBAKU_0000': (EN, '連爆 chain explosion — explosion frames'),
    'RESIST_0000': (M, 'Resist — crystal sphere'),
    'RE_DO_0000': (EN, '?? RE_DO — radial flash, swirl, particles'),
    'RIVA_0000': (SU, 'Leviathan — Tidal Wave: water textures + splash'),
    'RIVA_0001': (SU, 'Leviathan — water strand strips (multi-CLUT dumps)'),
    'RMISSILE_0000': (EN, '? rocket missile — swirl, flame, bursts'),
    'ROCKET_0000': (EN, 'Rocket — swirl, flame, bursts'),
    'ROLLFIRE_0000': (EN, 'Rolling Fire — flame bursts'),
    'SAIKYO_0000': (EN, '?? SAIKYO — heat/energy textures'),
    'SATAN_0000': (LB, 'Vincent — Satan Slam (Chaos): dark puffs'),
    'SCOPE_0000': (BO, 'Search Scope (Guard Scorpion) — green lens'),
    'SDUST_0000': (LB, 'Red XIII — Stardust Ray: star flare + star field'),
    'SEALD_0000': (M, 'Shield (シールド) — prism crystals'),
    'SEARCH_0000': (BO, 'Search Scope (Guard Scorpion) — green lens'),
    'SEED_0000': (EN, '?? SEED — bark textures + dust'),
    'SEIJA_0000': (EN, '?? SEIJA — magenta/green flame wisps'),
    'SEKIKA_0000': (EN, '石化 petrify — stone texture + puffs'),
    'SENNKOKU_0000': (ES, 'Death Sentence (死の宣告) — blurry counter glyph'),
    'SFLEA_0000': (ES, 'Shadow Flare (シャドウフレア) — dark swirl + orbs'),
    'SHAKU_0000': (EN, '?? SHAKU — radial flash, swirl, particles'),
    'SHINRA_0000': (LB, 'Yuffie — All Creation (森羅万象): blue energy texture'),
    'SHOWER_0000': (EN, 'Water shower — splashes + bubbles'),
    'SIVA_0000': (SU, 'Shiva — Diamond Dust: ice textures + shards'),
    'SLDFANG_0000': (LB, 'Red XIII — Sled Fang: glow + dust trail'),
    'SLIPL_0000': (M, 'Sleepel (スリプル) — purple bands'),
    'SLOW_0000': (M, 'Slow — clock face texture'),
    'SMKBALL_0000': (IT, 'Smoke bomb — smoke puffs'),
    'SMOG2_0000': (EN, 'Smog — smoke puffs'),
    'SOUTHERN_0000': (EN, 'Southern Cross (enemy) — bursts, swirl, star'),
    'SPADE1_0000': (EN, 'Card attack "Spade" — card faces'),
    'SPADE2_0000': (EN, 'Card attack "Spade" part 2 — tarot card'),
    'SPARK_0000': (EN, 'Spark — electric bolts + bursts'),
    'STING_0000': (EN, 'Sting — dust puffs'),
    'STOP_0000': (M, 'Stop — clock tick marks'),
    'SUMI_0000': (EN, '墨 ink — ink blots'),
    'SUNA_0000': (EN, '砂 sand — sand swirl + puffs'),
    'S_BEAM_0000': (LB, 'Barret — Satellite Beam: beam textures + ring'),
    'S_GUARD_0000': (LB, '? Aeris — Planet Protector (星の守護 "star guard"): gold star'),
    'TAIL_0000': (BO, 'Tail Laser (Guard Scorpion) — beam segments + bursts'),
    'TAN_0000': (EN, '?? TAN — green blob'),
    'TBREATH_0000': (EN, '?? T-Breath — energy textures + bars'),
    'THREAT_0000': (EN, '?? Threat — puffs'),
    'THUNDER2_0000': (M, 'Bolt (サンダー) part 2 — wavy bolts + bursts'),
    'THUNDERA_0000': (M, 'Bolt2 (サンダラ) — lightning column + crackle'),
    'THUNDER_0000': (M, 'Bolt (サンダー) — lightning strands + spark'),
    'THUNDG1_0000': (M, 'Bolt3 (サンダガ) — lightning textures'),
    'THUNDG2_0000': (M, 'Bolt3 (サンダガ) part 2 — lightning textures'),
    'TIFA_0000': (LB, 'Tifa — limit breaks (Final Heaven etc.): fists, glow, swirl'),
    'TIMEDMG_0000': (EN, '?? TIMEDMG — crystal + glow'),
    'TITAN_0000': (SU, 'Titan — Anger of the Land: dust columns'),
    'TORNADO_0000': (M, 'Tornado — vortex texture'),
    'TO_SEKI_0000': (EN, '投石 rock throw — ground texture + debris'),
    'TRAINN_0000': (EN, '?? TRAINN — electric radial burst'),
    'TRIANGLE_0000': (ES, 'Trine (トライン) — lightning strands'),
    'TSURARA_0000': (EN, 'つらら icicle — ice bands + puffs'),
    'UTAGOE_0000': (EN, '歌声 singing voice — music note'),
    'VAHAMUT_0000': (SU, 'Bahamut (Mega Flare) / VAHAMUT0 = Bahamut ZERO (planet) / VAHAMUT2 = Neo Bahamut?'),
    'VEGET_0000': (EN, '?? VEGET — fruit/leaf textures'),
    'WEP3_0000': (BO, 'WEAPON attack — fire textures'),
    'WEP4_000': (BO, 'WEAPON attack — dark flames + textures'),
    'WHIRL_0000': (EN, 'Whirlwind — vortex texture'),
    'WLASER_0000': (EN, 'W-Laser — beam segments + puffs'),
    'W_WIND_0000': (ES, 'White Wind — soft glow'),
    'YAMI_0000': (EN, '闇 darkness — dark puffs'),
    'YU_WAKU_0000': (EN, '誘惑 temptation/charm — hearts, streaks'),
    'ZENBAKU_0000': (EN, '全爆 explosion — explosion frames'),
}

# spell / limit / summon -> folders (or explicit sheet keys). The doc/summary picks the brightest
# non-mask sheet of each distinct layout (palette variants collapsed).
BEST_MAP = [
    ('Magic', 'Fire', ['FIRE_0000']), ('Magic', 'Fire2', ['FAIRA_0000']),
    ('Magic', 'Fire3', ['FAIGA_0000', 'FAIGA2_0000']),
    ('Magic', 'Ice (?)', ['REITO_0000']), ('Magic', 'Ice2', ['BRIZARA_0000']),
    ('Magic', 'Ice3', ['BRIZAG_0000', 'BRIZAG2_0000']),
    ('Magic', 'Bolt', ['THUNDER_0000']), ('Magic', 'Bolt2', ['THUNDERA_0000']),
    ('Magic', 'Bolt3', ['THUNDG1_0000', 'THUNDG2_0000']),
    ('Magic', 'Quake', ['QUEIK_0000']), ('Magic', 'Quake2', ['QUEIR_0000']), ('Magic', 'Quake3', ['QUEIG_0000']),
    ('Magic', 'Bio', ['BIO_0000']), ('Magic', 'Bio2', ['BIORA_0000']), ('Magic', 'Bio3', ['BIOGA1_0000', 'BIOGA2_0000']),
    ('Magic', 'Demi', ['GRAVIDE_0000']), ('Magic', 'Demi2', ['GRAVIRA_0000']), ('Magic', 'Demi3', ['GRAVIGA1_0000', 'GRAVIGA2_0000']),
    ('Magic', 'Comet', ['COMET_0000']), ('Magic', 'Freeze', ['FREEZE_0000']), ('Magic', 'Break', ['BREAK_0000']),
    ('Magic', 'Tornado', ['TORNADO_0000']), ('Magic', 'Flare', ['FLEA_0000']), ('Magic', 'Ultima', ['ALTEMA']),
    ('Magic', 'Cure / heal sparkle', ['IYASHI_0000', 'HIKARI_0000', 'HIKARI2_0000']),
    ('Magic', 'Full Cure', ['FULLSCAPE_0000']), ('Magic', 'Life', ['RAISE_0000']), ('Magic', 'Esuna', ['ESNA_0000']),
    ('Magic', 'Resist', ['RESIST_0000']), ('Magic', 'Shield', ['SEALD_0000']),
    ('Magic', 'Haste', ['HEIST_0000']), ('Magic', 'Slow', ['SLOW_0000']), ('Magic', 'Stop', ['STOP_0000']),
    ('Magic', 'Sleepel', ['SLIPL_0000']), ('Magic', 'Confu', ['CONF_0000']), ('Magic', 'Berserk', ['BERSERK_0000']),
    ('Magic', 'Mini', ['MINIMAM_0000']), ('Magic', 'Toad', ['FROG_0000']), ('Magic', 'Death', ['DEATH_0001']),
    ('Magic', 'Remove', ['DEJON_0000']), ('Magic', 'Drain (HP absorb)', ['Q_KETSU_0000']),
    ('Magic', 'MP absorb', ['Q_SHU_0000']),
    ('Enemy Skill', 'White Wind', ['W_WIND_0000']), ('Enemy Skill', 'Aqualung', ['AQUA_0000']),
    ('Enemy Skill', 'L5 Death', ['LV5DETH_0000']), ('Enemy Skill', 'Frog Song', ['KAERU_0000']),
    ('Enemy Skill', 'Goblin Punch', ['GOBLINP_0000']), ('Enemy Skill', 'Mighty Guard', ['MYTYG_0000']),
    ('Enemy Skill', 'Death Force', ['DETHFO_0000']), ('Enemy Skill', 'Trine', ['TRIANGLE_0000']),
    ('Enemy Skill', 'Shadow Flare', ['SFLEA_0000']), ('Enemy Skill', '????', ['HATENA_0000']),
    ('Enemy Skill', '1000 Needles', ['HARI1000_0000']), ('Enemy Skill', 'Beta (?)', ['BEATA_0000']),
    ('Enemy Skill', 'Flamethrower', ['KAEN_0000']), ('Enemy Skill', 'Laser', ['LASER_0000']),
    ('Enemy Skill', 'Death Sentence', ['SENNKOKU_0000']), ('Enemy Skill', 'Magic Breath (?)', ['MAGIKAL_0000']),
    ('Summon', 'Choco/Mog', ['CHOCO0_0000', 'DEBUCHO_0000']), ('Summon', 'Shiva', ['SIVA_0000']),
    ('Summon', 'Ifrit', ['IFLEET_0000']), ('Summon', 'Ramuh', ['LAMU_0000']), ('Summon', 'Titan', ['TITAN_0000']),
    ('Summon', 'Odin', ['ODIN1_0000']), ('Summon', 'Leviathan', ['RIVA_0000']),
    ('Summon', 'Bahamut', ['VAHAMUT_0000/VAHAMUT_0001']), ('Summon', 'Neo Bahamut (?)', ['VAHAMUT_0000/VAHAMUT2_0000']),
    ('Summon', 'Bahamut ZERO', ['VAHAMUT_0000/VAHAMUT0_0000', 'VAHAMUT_0000/VAHAMUT0_0001']),
    ('Summon', 'Kujata', ['KUJATA_0000']), ('Summon', 'Alexander', ['ALEX_0000', 'ALEX_0001']),
    ('Summon', 'Phoenix', ['PHOENIX_0000']), ('Summon', 'Hades', ['HADES_0000']),
    ('Summon', 'Knights of the Round', ['KNIGHTS_0000']),
    ('Limit', 'Cloud: Braver', ['BLAVER_0000']), ('Limit', 'Cloud: Cross-Slash', ['KYOGIRI_0000']),
    ('Limit', 'Cloud: Blade Beam', ['HAKOU_0000']), ('Limit', 'Cloud: Climhazzard', ['CLIMB_0000']),
    ('Limit', 'Cloud: Meteorain', ['MRAIN_0000']), ('Limit', 'Cloud: Finishing Touch', ['GARYU_0000']),
    ('Limit', 'Cloud: Omnislash', ['CHO_KYU_0000', 'BUSHIN2_0000']),
    ('Limit', 'Barret: Big Shot', ['HVSHOT_0000']), ('Limit', 'Barret: Mindblow (?)', ['M_BREAK_0000']),
    ('Limit', 'Barret: Grenade Bomb', ['GRENADE_0000']), ('Limit', 'Barret: Hammerblow', ['H_BLOW_0000']),
    ('Limit', 'Barret: Satellite Beam', ['S_BEAM_0000']), ('Limit', 'Barret: Ungarmax', ['ANGERMAX_0000']),
    ('Limit', 'Barret: Catastrophe', ['CATASTRO_0000']),
    ('Limit', 'Tifa: Beat Rush', ['BEAT_0000']), ('Limit', 'Tifa: other limits / Final Heaven', ['TIFA_0000']),
    ('Limit', 'Aeris: Healing Wind', ['IYASHI_0000']), ('Limit', 'Aeris: Breath of the Earth', ['DAICHI_0000']),
    ('Limit', 'Aeris: Fury Brand', ['BRAND_0000']), ('Limit', 'Aeris: Planet Protector (?)', ['S_GUARD_0000']),
    ('Limit', 'Aeris: Great Gospel', ['GOSPEL_0000']),
    ('Limit', 'Red XIII: Sled Fang', ['SLDFANG_0000']), ('Limit', 'Red XIII: Lunatic High', ['LUNATIC_0000']),
    ('Limit', 'Red XIII: Stardust Ray', ['SDUST_0000']), ('Limit', 'Red XIII: Howling Moon', ['HMOON_0000']),
    ('Limit', 'Red XIII: Earth Rave', ['ERAVE_0000']), ('Limit', 'Red XIII: Cosmo Memory', ['COSMO_0000']),
    ('Limit', 'Yuffie: Greased Lightning', ['JINRAI_0000']), ('Limit', 'Yuffie: Clear Tranquil', ['MEIKYO_0000']),
    ('Limit', 'Yuffie: Landscaper', ['JIBASIRI_0000']), ('Limit', 'Yuffie: Bloodfest', ['CHI_0000']),
    ('Limit', 'Yuffie: Doom of the Living (?)', ['GAISHU_0000']), ('Limit', 'Yuffie: All Creation', ['SHINRA_0000']),
    ('Limit', 'Cait Sith: Dice', ['DICE_0000']),
    ('Limit', 'Vincent: Beast Flare', ['BEAST_0000']), ('Limit', 'Vincent: Nightmare (?)', ['NIGHT_0000']),
    ('Limit', 'Vincent: Satan Slam', ['SATAN_0000']),
    ('Limit', 'Cid: Boost Jump', ['BOOST_0000']), ('Limit', 'Cid: Dynamite', ['DYNAMITE_0000']),
    ('Limit', 'Cid: Hyper Jump', ['HYPER_0000']), ('Limit', 'Cid: Dragon', ['DRAGONN_0000']),
    ('Limit', 'Cid: Dragon Dive', ['DIVE_0000']), ('Limit', 'Cid: Highwind', ['HIWIND_0000']),
    ('Boss', 'Guard Scorpion: Search Scope', ['SEARCH_0000', 'SCOPE_0000']),
    ('Boss', 'Guard Scorpion: Tail Laser', ['TAIL_0000']),
    ('Boss', 'Safer·Sephiroth: Supernova', ['LASBOSS2_0000']),
    ('Generic', 'Explosion', ['RENBAKU_0000', 'ZENBAKU_0000', 'JIBAKU1_0000']),
    ('Generic', 'Hit spark / electric', ['SPARK_0000', 'ELECBALL_0000']),
    ('Generic', 'Smoke / dust puff', ['SMKBALL_0000', 'DAISENP_0000', 'ECHOES_0000']),
]


def pick_best(atlas, spec):
    """spec = folder or explicit key -> list of keys: one per distinct layout (palette variants
    collapsed), choosing the brightest non-mask sheet; animated (non-static) preferred."""
    if '/' in spec:
        return [spec] if spec in atlas else []
    keys = [k for k in sorted(atlas) if k.split('/')[0] == spec]
    groups = {}
    for k in keys:
        root = atlas[k]['variant_of'] or k
        groups.setdefault(root, []).append(k)
    # largest layout group first; further groups only if they have a different sheet size
    # (a different texture set) - all-mask groups are skipped
    order = sorted(groups.values(), key=lambda g: (-len(g), g[0]))
    out, sizes = [], set()
    for g in order:
        cands = [k for k in g if not atlas[k]['inv']]
        if not cands:
            continue
        size = (atlas[cands[0]]['w'], atlas[cands[0]]['h'])
        if out and size in sizes:
            continue
        cands.sort(key=lambda k: (atlas[k]['static'], -atlas[k]['lum']))
        out.append(cands[0])
        sizes.add(size)
    if not out and keys:                    # folder holds only mask sheets: take the brightest anyway
        out = [max(keys, key=lambda k: atlas[k]['lum'])]
    return out


def _md_key(k):
    return '`%s`' % k


def write_docs(atlas, ui_items):
    lines = []
    A = lines.append
    A('# FF7 battle-effect atlas')
    A('')
    A('_Generated by `tools/build_assets.py` — do not edit by hand (edit the tables in the script and re-run)._')
    A('')
    A('Source: `references/FF7/<EFFECT>/*.png` — PS1 battle-effect texture dumps (ripped by Frederick Crescent, '
      'The Spriters Resource), %d sheets in %d folders. Output: `assets/fx/<FOLDER>/<file>.png` plus the atlas '
      '`assets/fx/fx_atlas.js` (`FF7.data.fxAtlas[\'FOLDER/file\']`).' % (len(atlas), len({k.split('/')[0] for k in atlas})))
    A('')
    A('## How the sheets were processed')
    A('')
    A('* **Alpha**: the sources are additive textures on black. `alpha = max(R,G,B)^%s`, `RGB = RGB / alpha` '
      '(un-premultiplied), so drawing with normal `source-over` over black reproduces the original; '
      '`globalCompositeOperation = \'lighter\'` gives the PS1 additive look. A flat dark non-black page fill '
      '(e.g. `(24,24,24)` CLUT backgrounds) is keyed to black first.' % ALPHA_GAMMA)
    A('* **Frames**: each sheet is split into 256-px PS1 texture pages (unless the picture is continuous across the '
      'seam). Per page: if the lit pixels sit in a regular grid (16…256 px cells with dark gutters) the lit cells are '
      'used in reading order; otherwise brightness > %d, 2-px dilation, connected components, specks dropped, '
      'overlapping boxes merged, reading order (row bands top→bottom, then left→right).' % LIT_T)
    A('* `frames: [[x,y,w,h],…]` source-pixel rects; `grid: [cw,ch]` when the whole sheet is one grid; '
      '`groups: [[first,count,cw,ch],…]` one entry per page/region when there are several (cw = 0: free-form boxes); '
      '`static: true` = single texture (a surface/sphere/background, not a flip-book); '
      '`inv: true` = contains a white-background page (mask / alternate CLUT dump — prefer a sibling sheet); '
      '`lum` = mean brightness of lit pixels (0–1).')
    A('* Many folders contain several sheets with the **same layout in different colours** (palette/CLUT variants, '
      'or the successive steps of a colour-cycling animation). They are marked “variant of …” below.')
    A('* **Contact sheets**: `assets/fx/_contact_01.png` … (20 sheets per page, sorted by key, drawn over grey; '
      'green boxes = grid cells, orange/blue/pink = free-form boxes of page 1/2/3). Handy for picking sheets.')
    A('* `ALTEMA/ALTEMA_0000.BMP` is pixel-identical to the PNG next to it, so the PNG is used (a BMP without a PNG '
      'twin would be converted).')
    A('* Frame order inside a flip-book is the reading order of the sheet; that matches the game for most '
      'explosion/puff strips, but multi-part sheets mix several sprite sets — use `groups` to pick one.')
    A('')
    A('## Quick map: spell / limit / summon → sheet keys')
    A('')
    A('Keys listed are the brightest non-mask sheet of each distinct layout in the folder(s). `?` = educated guess.')
    A('')
    A('| Type | Effect | Sheet keys |')
    A('|---|---|---|')
    for cat, name, specs in BEST_MAP:
        keys = []
        for sp in specs:
            keys += pick_best(atlas, sp)
        A('| %s | %s | %s |' % (cat, name, ', '.join(_md_key(k) for k in keys) or '—'))
    A('')
    A('## Folders')
    A('')
    A('Decoded from the internal names (Japanese romanisation: FAIRA = ファイラ Fire2, BRIZAG = ブリザガ Ice3, '
      'QUEIR = クエイラ Quake2, GRAVIDE = グラビデ Demi, FLEA = フレア Flare, HEIST = ヘイスト Haste, SLIPL = スリプル Sleepel, '
      'DEJON = デジョン Remove, SEALD = シールド Shield, IFLEET = Ifrit, LAMU = Ramuh, RIVA = Leviathan, VAHAMUT = Bahamut, '
      'CHO_KYU/BUSHIN = 超究武神覇斬 Omnislash, KYOGIRI = 凶斬り Cross-Slash, GARYU = 画竜点睛 Finishing Touch, …). '
      '`?` = guess, `??` = unidentified (description of the texture only).')
    A('')
    A('| Folder | Sheets | Category | Best guess |')
    A('|---|---:|---|---|')
    folders = sorted({k.split('/')[0] for k in atlas})
    for fo in folders:
        cat, desc = FOLDER_INFO.get(fo, ('?', '?? (not yet identified)'))
        n = sum(1 for k in atlas if k.split('/')[0] == fo)
        A('| `%s` | %d | %s | %s |' % (fo, n, cat, desc))
    A('')
    A('## All sheets')
    A('')
    A('Frame size = median frame w×h. Notes: **static** single texture, **mask** white-background dump, '
      '**grid** regular cells, **keyed** flat dark background removed, “= X” palette/animation variant of sheet X.')
    A('')
    A('| Key | Size | Frames | Frame size | lum | Notes | Effect (best guess) |')
    A('|---|---|---:|---|---:|---|---|')
    for k in sorted(atlas):
        e = atlas[k]
        notes = []
        if e['static']:
            notes.append('**static**')
        if e['inv']:
            notes.append('**mask**')
        if e['grid']:
            notes.append('grid %dx%d' % tuple(e['grid']))
        elif len(e['groups']) > 1:
            notes.append('%d parts' % len(e['groups']))
        if e['keyed']:
            notes.append('keyed')
        if e['variant_of']:
            notes.append('= `%s`' % e['variant_of'].split('/')[1])
        cat, desc = FOLDER_INFO.get(k.split('/')[0], ('?', '??'))
        A('| `%s` | %dx%d | %d | %dx%d | %.2f | %s | %s |' % (
            k, e['w'], e['h'], len(e['frames']), e['typ'][0], e['typ'][1], e['lum'], ', '.join(notes), desc))
    A('')
    A('## UI')
    A('')
    A('From `references/FF7/ZZ - Miscellanious/` (copied to `assets/ui/`, originals untouched):')
    A('')
    A('| File | Size | Source | What it is |')
    A('|---|---|---|---|')
    for (dst, size, src, what) in ui_items:
        A('| `%s` | %s | `%s` | %s |' % (dst, size, src, what))
    A('')
    ensure_dir(os.path.dirname(OUT_DOC))
    with open(OUT_DOC, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    return OUT_DOC


# --------------------------------------------------------------------------------------------
# TASK C - UI bits from "ZZ - Miscellanious"
# --------------------------------------------------------------------------------------------
SAVE_FACES = {1: 'cloud', 2: 'barret', 3: 'aeris', 4: 'caitsith', 5: 'redxiii', 6: 'cid', 7: 'tifa',
              8: 'vincent', 9: 'yuffie', 10: 'unknown10', 11: 'tseng', 12: 'elena', 13: 'rude',
              14: 'reno', 15: 'sephiroth'}
# sprite rects inside H_TEX_0022 (minigame HUD), [x, y, w, h]
HUD_RECTS = [('SCORE label', [0, 0, 106, 24]), ('HI-SCORE label', [0, 32, 106, 24]),
             ('READY', [3, 60, 114, 56]), ('GOAL', [131, 61, 115, 54]), ('Go!', [6, 130, 108, 60])] + \
            [('digit %d (big)' % i, [i * 16, 200, 16, 16]) for i in range(10)] + \
            [('digit %d (small)' % i, [i * 8, 224, 8, 10]) for i in range(10)]
FACE_RECTS = [('barret x3 (14px)', [92, 0, 42, 14]), ('aeris? x3', [92, 14, 42, 14]),
              ('tifa? x3', [92, 28, 42, 14]), ('red xiii? x3', [92, 42, 42, 14]),
              ('cloud x3 (22px)', [92, 56, 66, 22]), ('gauge frames', [0, 0, 92, 62])]


def _key_black(im, lo=6, gain=12):
    a = np.asarray(im.convert('RGB'))
    alpha = np.clip((a.max(axis=2).astype(np.int32) - lo) * gain, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([a, alpha]), 'RGBA')


def build_ui(contact=True):
    src = os.path.join(FX_SRC, MISC_DIR)
    ensure_dir(OUT_UI)
    items = []

    def put(dst, srcname, what, keyed=False):
        im = Image.open(os.path.join(src, srcname))
        out = os.path.join(OUT_UI, dst)
        if keyed:
            _key_black(im).save(out, optimize=True)
        else:
            im.convert('RGBA' if im.mode in ('RGBA', 'P', 'LA') else 'RGB').save(out, optimize=True)
        items.append(('assets/ui/' + dst, '%dx%d' % im.size, srcname, what))

    put('buster.png', 'SAVEMENU_0000.png', 'Buster Sword art on black (save/title screen)')
    put('choco.png', 'CHOCO_0000.png', 'Chocobo head icon (48x48)')
    faces = []
    for i, cid in sorted(SAVE_FACES.items()):
        put('face_%s.png' % cid, 'SAVEMENU_%04d.png' % i,
            'save-menu party face icon 16x16 (blue bg, white border): %s' % cid.replace('unknown10', 'unidentified sandy-haired man'))
        faces.append(Image.open(os.path.join(src, 'SAVEMENU_%04d.png' % i)).convert('RGBA'))
    strip = Image.new('RGBA', (16 * len(faces), 16))
    for i, f in enumerate(faces):
        strip.paste(f, (i * 16, 0))
    strip.save(os.path.join(OUT_UI, 'save_faces.png'), optimize=True)
    items.append(('assets/ui/save_faces.png', '%dx16' % (16 * len(faces)), 'SAVEMENU_0001-0015.png',
                  'all 15 face icons in one strip, 16 px apart, order: ' + ', '.join(SAVE_FACES[i] for i in sorted(SAVE_FACES))))
    put('minigame_hud.png', 'H_TEX_0022.png',
        'minigame HUD on black: SCORE / HI-SCORE plates, READY, GOAL, Go!, digits 0-9 big (16 px pitch at y=200) '
        'and small (8 px pitch at y=224). Rects: ' + '; '.join('%s %s' % (n, r) for n, r in HUD_RECTS[:5]))
    put('minigame_hud_a.png', 'H_TEX_0022.png', 'same, black keyed to transparent', keyed=True)
    put('minigame_faces.png', 'H_TEX_0031.png',
        'minigame face strip (3 expressions each) + grey gauge/box frames: ' + '; '.join('%s %s' % (n, r) for n, r in FACE_RECTS))
    put('minigame_faces_a.png', 'H_TEX_0031.png', 'same, black keyed to transparent', keyed=True)
    if contact:
        font = load_font(11)
        tiles = []
        for dst, size, srcname, what in items:
            im = Image.open(os.path.join(ROOT, dst)).convert('RGBA')
            s = 4 if max(im.size) <= 48 else (3 if max(im.size) <= 256 and im.size[1] <= 32 else 2 if max(im.size) <= 256 else 1)
            t = im.resize((im.size[0] * s, im.size[1] * s), Image.NEAREST)
            bg = Image.new('RGBA', t.size, (255, 0, 255, 255))
            bg.alpha_composite(t)
            d = ImageDraw.Draw(bg)
            rects = HUD_RECTS if 'minigame_hud' in dst else FACE_RECTS if 'minigame_faces' in dst else []
            for _, (x, y, w, h) in rects:
                d.rectangle([x * s, y * s, (x + w) * s - 1, (y + h) * s - 1], outline=(0, 255, 0, 255))
            tiles.append((os.path.basename(dst), bg))
        W = 1100
        x = y = 6
        rowh = 0
        pos = []
        for name, t in tiles:
            if x + t.size[0] > W:
                x, y, rowh = 6, y + rowh + 20, 0
            pos.append((name, t, x, y))
            x += t.size[0] + 10
            rowh = max(rowh, t.size[1])
        sheet = Image.new('RGB', (W, y + rowh + 22), (40, 40, 48))
        d = ImageDraw.Draw(sheet)
        for name, t, x, y in pos:
            sheet.paste(t.convert('RGB'), (x, y))
            d.text((x, y + t.size[1] + 3), name, fill=(255, 255, 255), font=font)
        sheet.save(os.path.join(OUT_UI, '_contact.png'))
    return items


# --------------------------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------------------------
def main(argv):
    contact = '--no-contact' not in argv
    only = None
    if '--only' in argv:
        only = argv[argv.index('--only') + 1]
        argv = [a for a in argv if a != only]
    tasks = [a for a in argv if not a.startswith('--')] or ['portraits', 'fx', 'ui', 'docs']
    if 'portraits' in tasks:
        print('[portraits]')
        build_portraits(contact)
    atlas = None
    if 'fx' in tasks:
        print('[fx]')
        atlas = process_fx(only)
        if only:
            pages = fx_contact_sheets(atlas, prefix='_debug_')
            print('  debug contact sheets:', [rel(p) for p, _ in pages])
            return
        with open(os.path.join(OUT_FX, '_atlas_cache.json'), 'w') as f:
            json.dump(atlas, f)
        print('  atlas:', rel(write_atlas_js(atlas)), '(%d sheets)' % len(atlas))
        if contact:
            for fn in os.listdir(OUT_FX):
                if fn.startswith('_contact_') or fn.startswith('_debug_'):
                    os.remove(os.path.join(OUT_FX, fn))
            pages = fx_contact_sheets(atlas)
            print('  %d contact sheets -> %s/_contact_NN.png' % (len(pages), rel(OUT_FX)))
    ui_items = []
    if 'ui' in tasks or 'docs' in tasks:
        print('[ui]')
        ui_items = build_ui(contact and 'ui' in tasks)
        print('  %d UI files -> %s' % (len(ui_items), rel(OUT_UI)))
    if 'docs' in tasks:
        print('[docs]')
        if atlas is None:
            cache = os.path.join(OUT_FX, '_atlas_cache.json')
            if not os.path.exists(cache):
                atlas = process_fx()
            else:
                with open(cache) as f:
                    atlas = json.load(f)
        print('  wrote', rel(write_docs(atlas, ui_items)))


if __name__ == '__main__':
    main(sys.argv[1:])

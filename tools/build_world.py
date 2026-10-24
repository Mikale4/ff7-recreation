#!/usr/bin/env python3
"""Build the FF7 world map tile grid -> js/data/world_map.js (+ docs/world_preview.png).

Re-runnable:  python tools/build_world.py
Deterministic (fixed RNG seed). Needs Python 3 + numpy + Pillow.

Pipeline
  1. Land/sea mask + relief from references/maps/world_map_ffj.gif (text labels are
     patched with the identical base image references/maps/chocobo_quality_map.gif).
     The 480x400 reference is cropped to y=15..355 and scaled by 0.8 -> 384x272 tiles
     (1 tile = 1.25 reference px, no aspect distortion).
  2. Base terrain from the relief shading (grass / hills / mountains).
  3. Hand-authored biomes and the story-gating walls (mountain ranges, rivers,
     Sleeping Forest, crater ring ...) in tile coordinates.
  4. Structures (Midgar, Junon), locations, chocobo tracks, vehicle starts.
  5. Sea depth: shallow band 'o' along coasts (Tiny Bronco water), deep 'O' elsewhere;
     Mideel / Round Island / Northern Crater coasts are kept deep; the Quadra Magic islands west then
     north of Mideel get their own shallow channel (blue / black / gold chocobos only).
  6. Encounter regions (multi-source flood fill from region seeds).
  7. Validation flood fills (printed), preview PNG, JS output.
"""
import os
import sys
import math
import random
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REF_FFJ = os.path.join(ROOT, 'references', 'maps', 'world_map_ffj.gif')
REF_CHO = os.path.join(ROOT, 'references', 'maps', 'chocobo_quality_map.gif')
OUT_JS = os.path.join(ROOT, 'js', 'data', 'world_map.js')
OUT_PNG = os.path.join(ROOT, 'docs', 'world_preview.png')
OUT_MD = os.path.join(ROOT, 'docs', 'world_map.md')

W, H = 384, 272
SCALE = 1.25        # reference px per tile
Y_OFF = 15          # reference crop top

# ----------------------------------------------------------------------------
# small numpy helpers (no scipy dependency)
# ----------------------------------------------------------------------------

def shift(a, dx, dy, fill=False):
    """Shift a 2D array by (dx,dy) without wrapping."""
    out = np.full_like(a, fill)
    h, w = a.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def dilate(m, it=1, diag=True):
    m = m.copy()
    for _ in range(it):
        n = m.copy()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n |= shift(m, dx, dy)
        if diag:
            for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                n |= shift(m, dx, dy)
        m = n
    return m


def erode(m, it=1, diag=True):
    return ~dilate(~m, it, diag)


def box_blur(a, r):
    a = a.astype(np.float64)
    for axis in (0, 1):
        acc = np.zeros_like(a)
        for d in range(-r, r + 1):
            acc += np.roll(a, d, axis=axis)
        a = acc / (2 * r + 1)
    return a


def dist_to(mask, maxd=64):
    """Chebyshev-ish BFS distance (8-neighbour) from True cells, capped at maxd."""
    d = np.full(mask.shape, maxd, np.int32)
    d[mask] = 0
    cur = mask.copy()
    seen = mask.copy()
    for k in range(1, maxd):
        nxt = dilate(cur, 1, True) & ~seen
        if not nxt.any():
            break
        d[nxt] = k
        seen |= nxt
        cur = nxt
    return d


def label(mask, diag=False):
    """Connected components (python BFS). Returns (labels, count)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diag:
        nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        q = deque([(x0, y0)])
        while q:
            x, y = q.popleft()
            for dx, dy in nb:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    q.append((nx, ny))
    return lab, n


# ----------------------------------------------------------------------------
# 1. reference sampling
# ----------------------------------------------------------------------------

def _load_ref(path):
    a = np.array(Image.open(path).convert('RGB')).astype(np.float64)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    white = (R > 160) & (G > 160) & (B > 160)
    black = (R < 40) & (G < 40) & (B < 40)
    yellow = (R > 200) & (G > 200) & (B < 100)
    teal = (R < 20) & (G > 40) & (G < 90) & (B > 40) & (B < 90)   # chocobo-map circles
    over = dilate(white | black | yellow | teal, 1)
    sea = (B - R > 40) & ~over
    land = ~sea & ~over
    lum = (R + G + B) / 3.0
    return lum, land, over


def _nearest_fill(val, valid):
    """Fill invalid cells with the value of a nearby valid cell (iterative dilation)."""
    val = val.copy()
    valid = valid.copy()
    while not valid.all():
        grown = False
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = shift(valid, dx, dy)
            take = sv & ~valid
            if take.any():
                val[take] = shift(val, dx, dy)[take]
                valid |= take
                grown = True
        if not grown:
            break
    return val


def _bilinear(img, tx, ty):
    """Sample reference image at tile centres."""
    px = (tx + 0.5) * SCALE - 0.5
    py = (ty + 0.5) * SCALE - 0.5 + Y_OFF
    h, w = img.shape
    px = np.clip(px, 0, w - 1.001)
    py = np.clip(py, 0, h - 1.001)
    x0 = np.floor(px).astype(int)
    y0 = np.floor(py).astype(int)
    fx = px - x0
    fy = py - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) +
            img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def ref_to_tile(px, py):
    return ((px + 0.5) / SCALE - 0.5, (py + 0.5 - Y_OFF) / SCALE - 0.5)


def reference_layers():
    l1, L1, o1 = _load_ref(REF_FFJ)
    l2, L2, o2 = _load_ref(REF_CHO)
    valid = ~o1 | ~o2
    land = np.where(~o1, L1, L2).astype(np.float64)
    lum = np.where(~o1, l1, l2)
    land = _nearest_fill(land, valid)
    lum = _nearest_fill(lum, valid)
    # relief = deviation from the flat-land grey (107,115,113) -> 111.7
    relief = np.where(land > 0.5, np.abs(lum - 111.67), 0.0)
    ty, tx = np.mgrid[0:H, 0:W].astype(np.float64)
    land_t = _bilinear(land, tx, ty)
    relief_t = _bilinear(relief, tx, ty)
    lum_t = _bilinear(lum, tx, ty)
    return land_t, relief_t, lum_t


# ----------------------------------------------------------------------------
# 2. geometry helpers (tile coordinates, x right / y down)
# ----------------------------------------------------------------------------

YY, XX = np.mgrid[0:H, 0:W].astype(np.float64)


def polyline_dist(pts):
    d = np.full((H, W), 1e9)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        vx, vy = bx - ax, by - ay
        l2 = vx * vx + vy * vy
        if l2 == 0:
            t = np.zeros_like(XX)
        else:
            t = np.clip(((XX - ax) * vx + (YY - ay) * vy) / l2, 0, 1)
        dx = XX - (ax + t * vx)
        dy = YY - (ay + t * vy)
        d = np.minimum(d, np.sqrt(dx * dx + dy * dy))
    return d


def meander(pts, amp, step, seed):
    """Subdivide a polyline and displace inner points sideways with a smooth random walk."""
    rng = np.random.RandomState(seed)
    out = [tuple(pts[0])]
    off = 0.0
    last = len(pts) - 2
    for si, ((ax, ay), (bx, by)) in enumerate(zip(pts[:-1], pts[1:])):
        L = math.hypot(bx - ax, by - ay)
        n = max(1, int(round(L / step)))
        nx, ny = -(by - ay) / L, (bx - ax) / L
        for k in range(1, n + 1):
            f = k / n
            px, py = ax + (bx - ax) * f, ay + (by - ay) * f
            if si == last and k == n:
                out.append((bx, by))
                break
            off = max(-amp, min(amp, off * 0.55 + rng.uniform(-amp, amp) * 0.75))
            out.append((px + nx * off, py + ny * off))
    return out


def line_mask(pts, r):
    return polyline_dist(pts) <= r


def disk(cx, cy, r):
    return (XX - cx) ** 2 + (YY - cy) ** 2 <= r * r


def ellipse(cx, cy, rx, ry):
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1.0


def rect(x0, y0, x1, y1):
    """inclusive tile rectangle"""
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)


def poly(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x, y) for x, y in pts], fill=1, outline=1)
    return np.array(im).astype(bool)


def value_noise(cell, seed, octaves=3):
    """Smooth value noise in [0,1], deterministic."""
    rng = np.random.RandomState(seed)
    out = np.zeros((H, W))
    amp, tot = 1.0, 0.0
    c = float(cell)
    for _ in range(octaves):
        gw, gh = int(W / c) + 3, int(H / c) + 3
        g = rng.rand(gh, gw)
        fx = XX / c
        fy = YY / c
        x0 = np.floor(fx).astype(int)
        y0 = np.floor(fy).astype(int)
        tx = fx - x0
        ty = fy - y0
        tx = tx * tx * (3 - 2 * tx)
        ty = ty * ty * (3 - 2 * ty)
        v = (g[y0, x0] * (1 - tx) * (1 - ty) + g[y0, x0 + 1] * tx * (1 - ty) +
             g[y0 + 1, x0] * (1 - tx) * ty + g[y0 + 1, x0 + 1] * tx * ty)
        out += v * amp
        tot += amp
        amp *= 0.5
        c /= 2.0
    return out / tot


# ----------------------------------------------------------------------------
# 3. legend / static data
# ----------------------------------------------------------------------------

LEGEND = {
    'O': 'ocean', 'o': 'shallow', 'r': 'river', 'R': 'deep_river',
    'g': 'grass', 'f': 'forest', 'j': 'jungle', 'h': 'hills', 'm': 'mountain',
    'M': 'peak', 'd': 'desert', 's': 'sand', 'n': 'snow', 'i': 'glacier',
    'w': 'wasteland', 'x': 'marsh', 'k': 'canyon', 'c': 'crater', 'C': 'city',
    'b': 'bridge', 'p': 'road', 'L': 'lava',
}
WALK = set('gfjhdsnwxkcbp')          # on foot
BUGGY = WALK | set('r')               # buggy (and blue/black/gold chocobo) also cross shallow rivers
SEA = set('Oo')

COLORS = {
    'O': (24, 44, 120), 'o': (56, 104, 184), 'r': (80, 160, 225), 'R': (36, 72, 160),
    'g': (96, 150, 72), 'f': (38, 100, 46), 'j': (20, 124, 70), 'h': (140, 152, 90),
    'm': (120, 100, 80), 'M': (210, 204, 200), 'd': (224, 198, 120), 's': (238, 226, 166),
    'n': (236, 242, 248), 'i': (166, 212, 236), 'w': (142, 122, 94), 'x': (80, 106, 86),
    'k': (188, 104, 62), 'c': (84, 58, 86), 'C': (86, 86, 98), 'b': (166, 112, 60),
    'p': (196, 174, 132), 'L': (222, 62, 20),
}

# id, name, entry (x,y) or None (computed), footprint (fx,fy,w,h) or None (1x1), icon, entry terrain
LOC_DEFS = [
    # --- eastern continent -------------------------------------------------
    ('midgar', 'Midgar', None, None, 'city', 'w'),
    ('kalm', 'Kalm', (257, 130), None, 'town', 'g'),
    ('chocobo_farm', 'Chocobo Farm', (298, 167), None, 'ranch', 'g'),
    ('mythril_mine_e', 'Mythril Mine', (283, 182), None, 'cave', 'k'),
    ('mythril_mine_w', 'Mythril Mine', (273, 182), None, 'cave', 'k'),
    ('junon', 'Junon', None, None, 'city', 's'),
    ('fort_condor', 'Fort Condor', (263, 200), (262, 196, 3, 4), 'tower', 'g'),
    ('temple_of_ancients', 'Temple of the Ancients', (224, 224), (223, 222, 3, 2), 'temple', 'j'),
    # --- western continent -------------------------------------------------
    ('costa_del_sol', 'Costa del Sol', (178, 149), None, 'town', 's'),
    ('mt_corel', 'Mt. Corel', (163, 157), None, 'cave', 'k'),
    ('north_corel', 'North Corel', (137, 158), None, 'village', 'w'),
    ('gold_saucer', 'Gold Saucer', (151, 191), (150, 188, 3, 4), 'tower', 'd'),
    ('corel_prison', 'Corel Prison', (157, 197), (156, 196, 2, 2), 'village', 'd'),
    ('weapon_seller', "Weapon Seller's House", (157, 222), None, 'house', 'g'),
    ('gongaga', 'Gongaga', (131, 226), None, 'village', 'j'),
    ('cosmo_canyon', 'Cosmo Canyon', (115, 208), None, 'village', 'k'),
    ('nibelheim', 'Nibelheim', (116, 167), None, 'town', 'g'),
    ('mt_nibel_e', 'Mt. Nibel', (113, 163), None, 'cave', 'k'),
    ('mt_nibel_w', 'Mt. Nibel', (100, 155), None, 'cave', 'k'),
    ('rocket_town', 'Rocket Town', (108, 141), None, 'town', 'g'),
    ('lucrecia_cave', "Lucrecia's Cave", (128, 177), None, 'cave', 'k'),
    ('ancient_forest', 'Ancient Forest', (104, 198), (103, 197, 3, 3), 'forest', 'f'),
    ('materia_cave_n', 'Materia Cave', (141, 127), None, 'cave', 'd'),
    # --- Wutai --------------------------------------------------------------
    ('wutai', 'Wutai', (43, 102), None, 'town', 'g'),
    ('da_chao', 'Da-chao Statues', (45, 96), (44, 93, 3, 3), 'shrine', 'h'),
    ('materia_cave_w', 'Materia Cave', (61, 170), None, 'cave', 'k'),
    # --- northern continent ------------------------------------------------
    ('bone_village', 'Bone Village', (190, 100), None, 'village', 'w'),
    ('sleeping_forest', 'Sleeping Forest', (190, 90), (185, 86, 11, 5), 'forest', 'f'),
    ('sleeping_forest_n', 'Sleeping Forest', (190, 84), None, 'forest', 'g'),
    ('forgotten_capital', 'Forgotten Capital', (188, 76), (187, 73, 3, 3), 'shrine', 'g'),
    ('corral_valley', 'Corral Valley', (180, 67), None, 'cave', 'k'),
    ('corral_valley_n', 'Corral Valley', (181, 56), None, 'cave', 'n'),
    ('icicle_inn', 'Icicle Inn', (163, 71), None, 'village', 'n'),
    ('chocobo_sage', "Chocobo Sage's House", (188, 58), None, 'house', 'n'),
    ('northern_crater', 'Northern Crater', (169, 30), (160, 21, 19, 19), 'crater', 'c'),
    # --- islands ------------------------------------------------------------
    ('mideel', 'Mideel', (283, 246), None, 'village', 'g'),
    ('materia_cave_e', 'Materia Cave', (257, 222), None, 'cave', 'O'),     # moved onto its islet by quadra_islands
    ('goblin_island', 'Goblin Island', (316, 88), (309, 84, 15, 9), 'forest', 'f'),
    ('round_island', 'Round Island', (351, 21), (344, 13, 17, 17), 'crater', 'g'),
    ('knights_of_round', 'Knights of the Round Cave', (355, 20), None, 'cave', 'k'),
    ('gelnika', 'Gelnika (sunken plane)', (194, 202), None, 'cave', 'O'),
]

# not reachable on foot by design (story / chocobo / air / submarine only)
UNREACHABLE = {
    'gold_saucer': 'enclosed Corel Desert (ropeway from North Corel / story)',
    'corel_prison': 'enclosed Corel Desert (story)',
    'northern_crater': 'ringed by high peaks (Highwind, end of disc 2)',
    'round_island': 'walled island, deep sea (gold chocobo)',
    'knights_of_round': 'inside Round Island (gold chocobo)',
    'gelnika': 'sunken plane (submarine)',
    'materia_cave_n': 'HP<->MP cave, walled plateau north of North Corel (black/gold chocobo)',
    'materia_cave_e': 'Quadra Magic cave on the northern tip of the last of the islands west then north of Mideel (blue/black/gold chocobo, brought in the Highwind)',
    'materia_cave_w': 'Mime cave in a walled pocket on the Wutai island (green/black/gold chocobo)',
    'ancient_forest': 'walled canyon plateau near Cosmo Canyon (green/black/gold chocobo)',
    'lucrecia_cave': 'waterfall cave on an inland lake (blue chocobo / submarine)',
    'goblin_island': 'isolated island in deep sea (Highwind / chocobo)',
}

CHOCOBO_TRACKS = [
    # x, y, region, best quality caught there (see docs for full ranges)
    (306, 160, 'chocobo_farm_area', 'poor'),
    (291, 158, 'chocobo_farm_area', 'poor'),
    (247, 193, 'junon_area', 'fair'),
    (179, 192, 'desert_edge', 'good'),
    (104, 130, 'rocket_area', 'great'),
    (47, 199, 'wutai_area', 'average'),
    (148, 84, 'icicle_area', 'wonderful'),
    (275, 247, 'mideel_area', 'great'),
]

REGION_IDS = [
    'midgar_area', 'kalm_area', 'chocobo_farm_area', 'marsh', 'mythril_area', 'junon_area',
    'condor_area', 'temple_area', 'costa_area', 'corel_area', 'desert', 'desert_edge',
    'gongaga_area', 'cosmo_area', 'nibel_area', 'rocket_area', 'wutai_area', 'bone_area',
    'forest_north', 'capital_area', 'icicle_area', 'north_snow', 'crater_area', 'mideel_area',
    'round_area', 'goblin_area', 'ocean',
]
REGION_CHARS = 'abcdefghijklmnopqrstuvwxy' + 'z~'    # ... goblin_area='z', ocean='~'

# Suggested world-map encounter tables (ids used by js/data/encounters_*.js). The engine can try
# base + TERRAIN_SUFFIX[tile] first (e.g. wm_cosmo_canyon, wm_junon_beach) and fall back to base.
REGION_ENCOUNTERS = {
    'midgar_area': 'wm_midgar', 'kalm_area': 'wm_kalm', 'chocobo_farm_area': 'wm_chocobo_farm',
    'marsh': 'wm_marsh', 'mythril_area': 'wm_junon', 'junon_area': 'wm_junon', 'condor_area': 'wm_condor',
    'temple_area': 'wm_temple', 'costa_area': 'wm_costa', 'corel_area': 'wm_corel',
    'desert': 'wm_desert_edge_desert', 'desert_edge': 'wm_desert_edge', 'gongaga_area': 'wm_gongaga',
    'cosmo_area': 'wm_cosmo', 'nibel_area': 'wm_nibel', 'rocket_area': 'wm_rocket', 'wutai_area': 'wm_wutai',
    'bone_area': 'wm_bone', 'forest_north': 'wm_bone', 'capital_area': 'wm_north', 'icicle_area': 'wm_icicle',
    'north_snow': 'wm_icicle', 'crater_area': 'wm_icicle', 'mideel_area': 'wm_mideel',
    'round_area': 'wm_goblin_island', 'goblin_area': 'wm_goblin_island', 'ocean': 'wm_seafloor',
}
TERRAIN_SUFFIX = {'s': '_beach', 'f': '_forest', 'j': '_jungle', 'k': '_canyon', 'w': '_dirt',
                  'd': '_desert', 'g': '_grass', 'h': '_grass', 'p': '_grass', 'b': '_grass'}

REGION_SEEDS = {
    'midgar_area': [(247, 142), (238, 151), (232, 134), (246, 133)],
    'kalm_area': [(257, 128), (268, 136), (262, 122), (250, 120)],
    'chocobo_farm_area': [(298, 165), (312, 160), (325, 150), (302, 142), (290, 140), (318, 172)],
    'marsh': [(291, 178)],
    'mythril_area': [(272, 182), (268, 176)],
    'junon_area': [(229, 179), (240, 168), (236, 194), (250, 176), (247, 192)],
    'condor_area': [(263, 202), (276, 204), (292, 200), (256, 192)],
    'temple_area': [(224, 226), (210, 230)],
    'costa_area': [(176, 150)],
    'corel_area': [(137, 160), (141, 127)],
    'desert': [(151, 186)],
    'desert_edge': [(150, 215), (179, 192), (160, 225)],
    'gongaga_area': [(131, 228), (145, 232)],
    'cosmo_area': [(115, 206), (100, 206), (122, 196)],
    'nibel_area': [(116, 170), (106, 178), (90, 172)],
    'rocket_area': [(108, 141), (88, 150), (104, 130)],
    'wutai_area': [(43, 101), (45, 170), (40, 130), (60, 70)],
    'bone_area': [(190, 100), (205, 108)],
    'forest_north': [(190, 91)],
    'capital_area': [(188, 76), (205, 76)],
    'icicle_area': [(163, 71), (148, 84), (156, 64)],
    'north_snow': [(182, 55), (170, 44), (188, 58)],
    'crater_area': [(169, 30)],
    'mideel_area': [(283, 246)],
    'round_area': [(351, 21)],
    'goblin_area': [(316, 88)],
}


# ----------------------------------------------------------------------------
# 4. world painter
# ----------------------------------------------------------------------------

class World:
    def __init__(self, land):
        self.land = land.copy()
        self.t = np.where(land, 'g', 'O').astype('<U1')
        self.lock = np.zeros((H, W), bool)      # tiles connectivity repair may not touch

    def paint(self, mask, code, where=None, lock=False, over_lock=False, make_land=False):
        m = mask.copy()
        if make_land:
            self.land |= m if over_lock else (m & ~self.lock)
        m &= self.land
        if not over_lock:
            m &= ~self.lock
        if where is not None:
            m &= np.isin(self.t, list(where))
        self.t[m] = code
        if lock:
            self.lock |= m
        return m

    _wall_seed = 100

    def wall(self, pts, r, core=True, code='m', jitter=1.4, foothills=2.5, meander_amp=1.8):
        """Impassable mountain range along a polyline. Locked.

        The polyline is subdivided and meandered (end points fixed) so ranges curve naturally.
        The guaranteed core (distance <= 1.2 tiles, i.e. >= 2 tiles thick) blocks 8-neighbour
        movement; the outer edge is jittered with noise, peaks 'M' form broken ridges along the
        crest, and unlocked spurs 'm' / walkable foothills 'h' flank the range.
        """
        World._wall_seed += 1
        seed = World._wall_seed
        if meander_amp:
            pts = meander(pts, meander_amp, 3.5, seed)
        d = polyline_dist(pts)
        n1 = value_noise(5, seed)
        n2 = value_noise(3, seed + 500)
        n3 = value_noise(2.5, seed + 900)
        rr = r + (n1 - 0.5) * 2 * jitter
        m = ((d <= 1.2) | (d <= rr)) & self.land & ~self.lock
        self.t[m] = code
        if core:
            c = m & (d <= np.maximum(rr - 1.6, 0.0)) & (n2 > 0.45)
            self.t[c] = 'M'
        self.lock |= m
        if foothills:
            free = self.land & ~self.lock
            spur = (d <= rr + 2.0) & free & (n3 > 0.66) & np.isin(self.t, list('gfwh'))
            self.t[spur] = 'm'
            fh = (d <= rr + foothills) & free & np.isin(self.t, list('gfw')) & (n2 > 0.35)
            self.t[fh] = 'h'
        return m

    def river(self, pts, r=1.0, code='r'):
        m = line_mask(pts, r) & self.land & ~self.lock
        self.t[m] = code
        self.lock |= m
        return m

    def set(self, x, y, code, lock=True):
        self.t[y, x] = code
        self.land[y, x] = code not in SEA
        if lock:
            self.lock[y, x] = True


# ----------------------------------------------------------------------------
# 5. build
# ----------------------------------------------------------------------------

def build_land(land_p):
    thr = np.full((H, W), 0.5)
    thr[rect(24, 54, 74, 150)] = 0.34           # keep Wutai's thin crescent in one piece
    thr[rect(250, 186, 362, 262)] = 0.42        # Mideel / eastern arcs
    land = land_p > thr
    # hand fixes -----------------------------------------------------------
    land |= ellipse(316, 88, 7.5, 4.5)          # Goblin Island (hidden under reference labels)
    land |= disk(352, 21, 8.2)                  # Round Island (far north-east)
    land |= ellipse(351, 178, 3.5, 6)           # Quadra Magic materia cave island
    land |= ellipse(283, 246, 5, 3)             # Mideel town site
    land |= line_mask([(66, 60), (58, 72), (50, 86), (45, 96), (43, 104)], 1.6)   # Wutai spine
    # northern continent: close the top of the fjord so the Corral Valley exit links the
    # Icicle plateau (west) with the Chocobo Sage's nook (east); the fjord still splits
    # the Icicle side from the Capital valley further south
    land |= rect(176, 51, 182, 60)
    # Temple of the Ancients: its own island south of Junon (cut the thin land link)
    land &= ~line_mask([(228, 213.5), (236, 213.5), (244, 214)], 1.3)
    # Gold Saucer area: the east peninsula joins the land south of the desert
    land |= line_mask([(164, 214), (171, 213), (178, 210)], 1.8)
    # remove specks
    lab, n = label(land)
    sizes = np.bincount(lab.ravel())
    small = sizes < 3
    small[0] = False
    land &= ~small[lab]
    return land


def blob(cx, cy, rx, ry, jit=0.3, seed=0, cell=4):
    """Ellipse with a noisy edge."""
    n = value_noise(cell, 900 + seed)
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1.0 + (n - 0.5) * 2 * jit


def build():
    land_p, relief, _lum = reference_layers()
    land = build_land(land_p)
    World._wall_seed = 100          # deterministic even if build() runs twice in one process
    wd = World(land)
    t = wd.t
    rel = box_blur(relief, 1)

    # ---- base: grass / hills / mountains from the reference relief shading ----------
    t[land & (rel >= 9)] = 'h'
    t[land & (rel >= 17)] = 'm'
    t[land & (rel >= 27)] = 'M'
    forest_n = value_noise(9, 11)
    t[land & (t == 'g') & (forest_n > 0.64)] = 'f'
    t[land & (t == 'h') & (forest_n > 0.70)] = 'f'

    # ======================= EASTERN CONTINENT ===========================
    # Midgar surroundings: barren wasteland
    wd.paint(blob(240, 142, 14, 12, 0.3, 1), 'w', where='gfh')
    wd.paint(blob(240, 142, 11, 10, 0.3, 2), 'w', where='mM')
    # Kalm: grass & forests
    wd.paint(blob(258, 131, 4, 3, 0.2, 3), 'g', where='fhmM')
    for i, (cx, cy, r) in enumerate(((264, 124, 3.5), (250, 124, 3), (270, 134, 3), (262, 138, 2.5))):
        wd.paint(blob(cx, cy, r, r, 0.4, 10 + i), 'f', where='gh')
    # Chocobo Farm grasslands: open, gentle
    wd.paint(blob(305, 160, 22, 14, 0.25, 4), 'h', where='mM')
    wd.paint(blob(300, 166, 6, 4, 0.2, 5), 'g', where='hfmM')
    # Midgar Zolom marsh (south-west of the farm, against the range)
    marsh = poly([(282, 166), (293, 165), (299, 170), (301, 180), (297, 189), (286, 190), (281, 184), (280, 174)])
    wd.paint(marsh | blob(291, 178, 8, 10, 0.3, 6), 'x', where='gfhmMw')
    # Junon side: forests (Yuffie), beach below Junon
    for i, (cx, cy, r) in enumerate(((246, 186, 4), (238, 197, 3.5), (254, 176, 3.5), (266, 186, 3), (232, 166, 3))):
        wd.paint(blob(cx, cy, r, r, 0.4, 20 + i), 'f', where='gh')
    wd.paint(rect(218, 184, 228, 196) & dilate(~wd.land, 2), 's', where='ghf')
    # Temple of the Ancients island: jungle
    wd.paint(rect(192, 215, 242, 246), 'j', where='gfh')
    # -- story walls (locked) --
    # E-W range between Midgar and Junon (west coast -> N-S range)
    wd.wall([(214, 161), (224, 158), (234, 157), (246, 155), (258, 153), (270, 151), (285, 148)], 3.0)
    # N-S range: marsh / farm | Junon & Fort Condor. The Mythril Mine tunnels through it.
    wd.wall([(285, 146), (283, 154), (281, 162), (279, 170), (278, 178), (278, 186), (277, 193)], 3.0)
    # southern range: farm pocket | Condor lowlands, to the east coast
    wd.wall([(276, 192), (286, 192), (296, 191), (308, 188), (320, 184), (332, 178), (346, 171)], 2.7)
    # Fort Condor's mountain
    wd.paint(disk(263, 197, 1.8), 'm', lock=True)
    wd.set(263, 197, 'M')

    # ======================= WESTERN CONTINENT ===========================
    # Northern plateau (HP<->MP materia cave inside, walled off)
    plateau = poly([(122, 115), (160, 112), (162, 134), (154, 141), (140, 143), (128, 143), (121, 132)])
    wd.paint(plateau, 'm', lock=True)
    wd.paint(plateau & erode(plateau & wd.land, 2) & (value_noise(3, 31) > 0.55), 'M', over_lock=True)
    wd.paint(blob(141, 127, 5.5, 3.2, 0.2, 7), 'd', over_lock=True, lock=True)
    wd.paint(line_mask([(135, 131), (140, 131.5), (147, 131)], 0.6), 'R', over_lock=True, lock=True)
    # Mt. Corel range: Costa del Sol pocket | North Corel
    wd.wall([(155, 128), (156, 138), (155, 148), (155, 158), (157, 166), (160, 174)], 4.3)
    # spine: Rocket Town / Nibelheim side | North Corel & the desert
    wd.wall([(123, 116), (126, 128), (128, 138), (129, 148), (130, 158), (131, 168), (130, 175), (128, 178)], 3.0)
    # North Corel valley floor (mining wasteland)
    wd.paint(blob(141, 158, 11, 14, 0.3, 8), 'w', where='gfhmM')
    # Corel Desert, ringed by cliffs
    des_in = ellipse(151, 189, 13, 12) & wd.land
    des_ring = blob(151, 189, 16.5, 15.5, 0.1, 9) & wd.land & ~des_in
    wd.paint(des_in, 'd', over_lock=True)
    wd.paint(des_in & dilate(~wd.land, 2), 'm', over_lock=True)
    wd.paint(des_ring, 'm', over_lock=True, lock=True)
    wd.paint(ellipse(151, 189, 15.2, 14.2) & des_ring & (value_noise(3, 33) > 0.3), 'M', over_lock=True)
    wd.lock |= des_in
    # link the spine to the desert ring (closes North Corel's valley to the south)
    wd.wall([(128, 170), (134, 172), (140, 174)], 2.6)
    # Lucrecia's waterfall lake at the south end of the spine
    wd.paint(disk(128, 181, 2.3), 'R', over_lock=True, lock=True)
    # shallow rivers: lake -> junction, junction -> south coast, junction -> south-west coast
    wd.river([(128, 183), (128, 190), (127, 197), (129, 204), (132, 211)], 1.1)
    wd.river([(132, 211), (137, 217), (142, 223), (146, 229), (149, 235), (151, 242)], 1.1)
    wd.river([(132, 211), (124, 216), (116, 222), (108, 229), (100, 236), (94, 242)], 1.1)
    # Mt. Nibel range: Nibelheim | Rocket Town (west coast -> spine)
    wd.wall([(64, 166), (76, 163), (88, 161), (98, 160), (108, 159), (118, 158), (130, 156)], 3.0)
    # Nibelheim valley: flanking peaks, forests
    wd.paint(blob(106, 167, 3, 4, 0.3, 12), 'm', where='ghf')
    wd.paint(blob(125, 169, 2.5, 5, 0.3, 13), 'm', where='ghf')
    for i, (cx, cy, r) in enumerate(((108, 176, 4), (96, 170, 3.5), (118, 184, 3))):
        wd.paint(blob(cx, cy, r, r, 0.4, 40 + i), 'f', where='gh')
    # Cosmo Canyon: red canyon ground
    wd.paint(blob(114, 206, 9, 8, 0.45, 14), 'k', where='ghfmM')
    wd.paint(blob(108, 214, 4, 3, 0.4, 24) | blob(122, 203, 3, 4, 0.4, 25), 'k', where='ghf')
    # Ancient Forest: forest on a walled canyon plateau near Cosmo Canyon
    wd.paint(disk(104, 198, 4.6), 'm', over_lock=True, lock=True, make_land=True)
    wd.paint(disk(104, 198, 4.6) & ~disk(104, 198, 3.4) & (value_noise(2, 35) > 0.5), 'M', over_lock=True)
    wd.paint(disk(104, 198, 2.3), 'f', over_lock=True, lock=True)
    # Gongaga: jungle, frog forest
    wd.paint(blob(133, 229, 12, 9, 0.35, 15), 'j', where='ghf')
    wd.paint(blob(118, 229, 3.5, 3.5, 0.3, 16), 'f', where='gjh')
    # buggy zone south of the desert: grass with scrub
    wd.paint(rect(131, 198, 184, 236) & (forest_n > 0.6), 'w', where='g')
    # Costa del Sol pocket: river + bridge + trail to Mt. Corel
    wd.paint(line_mask([(168, 153), (168, 160), (169, 170)], 0.7), 'R', lock=True)
    wd.paint(rect(166, 157, 170, 157), 'b', where='R', over_lock=True, lock=True)
    wd.paint(line_mask([(177, 150), (175, 153), (172, 156), (169, 157)], 0.5), 'p', where='gfhsw')
    wd.paint(line_mask([(167, 157), (162, 157)], 0.5), 'p', where='gfhsw')
    wd.paint(disk(178, 149, 4) & dilate(~wd.land, 2), 's', where='gfhw')
    # rail from North Corel towards Mt. Corel
    wd.paint(line_mask([(138, 158), (144, 157), (150, 156)], 0.5), 'p', where='gfhwmM')

    # ======================= WUTAI ===========================
    wd.paint(disk(43, 102, 2.5), 'g', where='fhmM')
    wd.paint(rect(40, 194, 60, 206) & dilate(~wd.land, 1), 's', where='gfh')
    wd.paint(disk(61, 170, 4.4) & ~disk(61, 170, 1.8), 'm', over_lock=True, lock=True, make_land=True)
    wd.paint(disk(61, 170, 1.8), 'k', over_lock=True, lock=True, make_land=True)

    # ======================= NORTHERN CONTINENT ===========================
    north = rect(128, 8, 232, 124)
    sn = value_noise(4, 41) - 0.5
    wd.snowy = north & (((XX <= 167 + sn * 6) & (YY <= 98)) | (YY <= 60 + sn * 3))
    wd.paint(wd.snowy, 'n', where='gfhw')
    # glacier & high peaks north of Icicle Inn (Great Glacier / Gaea's Cliff are field maps)
    glacier = north & (YY <= 50) & wd.land
    wd.paint(glacier, 'i', where='nmhgfM', lock=True)
    wd.paint(glacier & (rel >= 23), 'M', lock=True, over_lock=True)
    wd.paint(glacier & (value_noise(6, 23) > 0.68), 'n', where='i', over_lock=True)
    # Northern Crater: crater floor ringed by high peaks
    wd.paint(disk(169, 30, 5.6), 'c', over_lock=True, lock=True, make_land=True)
    wd.paint(disk(169, 30, 9.6) & ~disk(169, 30, 5.6), 'M', over_lock=True, lock=True, make_land=True)
    # Lifestream steam vents on the crater floor (the entry tile stays crater ground)
    wd.paint((disk(167, 28, 1.2) | disk(172, 31, 1.0) | disk(168, 33, 0.8)), 'L', over_lock=True, lock=True)
    # Sleeping Forest: dense forest band with a ridge behind it (Bone side | Capital side)
    wd.wall([(164, 87), (172, 87.5), (182, 86.5), (192, 87), (202, 87.5), (212, 86.5), (228, 88)], 1.3,
            core=False, jitter=0.6, foothills=0, meander_amp=0.7)
    band = (XX >= 166) & (YY >= 88) & (YY <= 92 + value_noise(4, 37) * 3)
    wd.paint(band, 'f', where='ghmMw')
    wd.paint(rect(174, 80, 226, 86) & (forest_n > 0.4), 'f', where='gh')
    # Icicle plateau | Capital valley (the fjord continues this line to the north)
    wd.wall([(170, 91), (170, 82), (171, 74), (174, 66)], 2.2)
    # Capital valley north wall (the Corral Valley cave tunnels through it)
    wd.wall([(174, 62), (180, 62), (188, 63), (196, 64), (204, 63), (212, 62), (228, 64)], 2.2)
    # Bone Village side | west lobe of the Icicle plateau
    wd.wall([(168, 88), (167, 95), (165, 102), (163, 110)], 2.0)
    # snowy corridor from the Corral Valley exit: west to the plateau, east to the Chocobo Sage
    cor = line_mask([(160, 57), (170, 55), (181, 55.5), (188, 57)], 1.7) & wd.land
    t[cor] = 'n'
    wd.lock &= ~cor
    # Bone Village dig site + beach
    wd.paint(blob(191, 101, 7, 5, 0.3, 17), 'w', where='gfh')
    wd.paint(rect(170, 94, 226, 124) & dilate(~wd.land, 1), 's', where='gfhw')
    # Capital valley: grass around the city
    wd.paint(blob(188, 75, 5, 4, 0.3, 18), 'g', where='fhmM')

    # ======================= ISLANDS ===========================
    # Round Island: ring of peaks, grass inside
    wd.paint(disk(352, 21, 8.2) & ~disk(352, 21, 4.6), 'm', over_lock=True, lock=True)
    wd.paint(disk(352, 21, 7.0) & ~disk(352, 21, 5.4), 'M', over_lock=True, lock=True)
    wd.paint(disk(352, 21, 4.6), 'g', over_lock=True)
    # Goblin Island: forest
    wd.paint(ellipse(316, 88, 7.5, 4.5), 'f', over_lock=True)
    wd.paint(ellipse(316, 88, 7.5, 4.5) & dilate(~wd.land, 1), 'g', over_lock=True)
    # the island east of the farm: plain grass (the Quadra Magic cave is on the Mideel islands, see
    # quadra_islands, as in FF7)
    wd.paint(ellipse(351, 178, 3.5, 6), 'g', over_lock=True)
    # Mideel: grass around the village
    wd.paint(blob(283, 246, 5, 3, 0.2, 19), 'g', where='fhmM')

    # ======================= STRUCTURES ===========================
    # Midgar: circular city (plate + sectors)
    wd.paint(disk(239, 142, 6.5), 'C', over_lock=True, lock=True, make_land=True)
    # Junon: city on the coast with the cannon platform out over the sea
    wd.paint(rect(222, 175, 227, 183) | rect(217, 178, 222, 180), 'C', over_lock=True, lock=True, make_land=True)

    wd.relief = rel
    return wd


def place_locations(wd):
    locs = []
    for lid, name, entry, fp, icon, code in LOC_DEFS:
        if lid == 'midgar':
            entry = (246, 142)
            fp = (233, 136, 13, 13)
        elif lid == 'junon':
            entry = (228, 179)
            fp = (217, 175, 11, 9)
        x, y = entry
        if code == 'O':
            wd.set(x, y, 'O')
        else:
            wd.set(x, y, code)
        fx, fy, w, h = fp if fp else (x, y, 1, 1)
        locs.append(dict(id=lid, name=name, x=x, y=y, w=w, h=h, fx=fx, fy=fy, icon=icon))
    return locs


# ----------------------------------------------------------------------------
# 6. connectivity repair (carves passes through *unlocked* relief mountains only)
# ----------------------------------------------------------------------------

def carve_path(wd, a, b, passable, what=''):
    import heapq
    t, lock = wd.t, wd.lock
    INF = 1 << 30
    carvable = wd.land & ~lock & np.isin(t, list('mMi'))
    ok = np.isin(t, list(passable))
    dist = np.full((H, W), INF, np.int64)
    prev = {}
    ax, ay = a
    bx, by = b
    dist[ay, ax] = 0
    pq = [(0, ax, ay)]
    while pq:
        d, x, y = heapq.heappop(pq)
        if (x, y) == (bx, by):
            break
        if d > dist[y, x]:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H):
                continue
            if ok[ny, nx] or (nx, ny) == (bx, by):
                c = 1
            elif carvable[ny, nx]:
                c = 14
            else:
                continue
            nd = d + c
            if nd < dist[ny, nx]:
                dist[ny, nx] = nd
                prev[(nx, ny)] = (x, y)
                heapq.heappush(pq, (nd, nx, ny))
    if dist[by, bx] >= INF:
        return None
    carved = 0
    cur = (bx, by)
    while cur != (ax, ay):
        x, y = cur
        if not ok[y, x]:
            c = t[y, x]
            t[y, x] = 'n' if (c == 'i' or wd.snowy[y, x]) else 'h'
            carved += 1
        cur = prev[cur]
    return carved


# ----------------------------------------------------------------------------
# 7. sea depth (shallow band for the Tiny Bronco)
# ----------------------------------------------------------------------------

SHELVES = [
    # shallow "shelves" joining coasts so the Tiny Bronco can cross between continents
    [(94, 138), (84, 144), (74, 150), (66, 156)],                 # Rocket Town coast -> Wutai
    [(150, 118), (160, 115), (170, 113), (180, 111), (190, 108)], # west continent north coast -> Bone Village
    [(186, 152), (196, 160), (206, 168), (214, 174), (220, 178)], # Costa del Sol -> Junon
    [(219, 188), (220, 200), (224, 210)],                         # Junon -> Temple island
    [(160, 238), (176, 234), (194, 232)],                         # Gongaga beach -> Temple island
]


# FF7's Quadra Magic cave: "at the end of a series of islands west then north of Mideel; the cave is on
# the northern tip of the last island" (Chocobo Breeding Guide). A broken-off archipelago: three islets of
# different sizes with ragged coasts in a winding channel of shallow water (3-7 tiles wide, wider around
# each islet) that leaves the north coast of Mideel's western lobe, curls west, then north. The channel is
# kept 4+ tiles of deep ocean away from every other shallow sea (no Tiny Bronco) and from any other land;
# every islet is ringed by shallows (the submarine can't let anyone off), and the last islet (the cave)
# has no tile the Highwind can land on. Blue, black and gold chocobos cross the shallows (a blue / black
# one is brought in the Highwind); a green one, the buggy or a player on foot can't.
QUADRA_PATH = [(260, 241.5), (258, 239.5), (256, 237.5), (254.6, 235), (254.4, 232), (255.4, 229.2),
               (257.6, 227.4), (260, 225.6), (261.6, 223.2)]                             # the channel's course
# islets: centre, radii, coast tiles: how many and which ('g' grass / 's' sand: landable edges on the first
# two; 'k' rock on the cave islet, which has nothing the Highwind can land on)
QUADRA_ISLANDS = [(256.6, 237.4, 1.5, 2.1, 2, 'gs'), (254.8, 231.4, 2.5, 1.9, 2, 'g'), (259.8, 226.6, 2.0, 2.6, 3, 'k')]


def quadra_islands(wd):
    t = wd.t
    lab, _ = label(wd.land, diag=True)
    mideel = lab == lab[246, 283]
    foreign = (t == 'o') | (t == 'r') | (wd.land & ~mideel)
    clear = dist_to(foreign, 8) > 3
    n_w = value_noise(3, 71)                      # channel width
    n_c = value_noise(2, 72)                      # coasts
    n_e = value_noise(2, 73)                      # coast tiles
    ch = polyline_dist(QUADRA_PATH) <= 1.4 + 2.2 * n_w
    ells = []
    for cx, cy, rx, ry, _, _ in QUADRA_ISLANDS:
        e = ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2
        ells.append(e)
        ch |= ((XX - cx) / (rx + 2.2 + 1.2 * n_w)) ** 2 + ((YY - cy) / (ry + 2.2 + 1.2 * n_w)) ** 2 <= 1.0
    ch &= clear & (t == 'O')
    t[ch] = 'o'
    inner = erode(ch, 1, diag=True)               # an islet tile has shallow water all around
    wd.quadra_ch = ch
    wd.quadra_isles = []
    for (cx, cy, rx, ry, ncoast, coast), e in zip(QUADRA_ISLANDS, ells):
        m = (e <= 1.0 + 0.9 * (n_c - 0.5)) & inner
        lab2, n = label(m, diag=False)            # the largest piece only (no stray rocks)
        if n > 1:
            sizes = np.bincount(lab2.ravel()); sizes[0] = 0
            m = lab2 == int(np.argmax(sizes))
        t[m] = 'f'
        wd.land |= m
        edge = m & ~erode(m, 1, diag=False)
        ys, xs = np.nonzero(edge)
        order = np.argsort(-n_e[ys, xs])[:ncoast]                  # a few coast tiles, where the noise peaks
        for k, j in enumerate(order):
            t[ys[j], xs[j]] = coast[k % len(coast)]
        wd.quadra_isles.append(m)
    # the cave: the northern tip of the last islet (the tile nearest its centre line on the top row)
    last = wd.quadra_isles[-1]
    ys, xs = np.nonzero(last)
    top = ys.min()
    cxs = xs[ys == top]
    tip = (int(cxs[np.argmin(np.abs(cxs - QUADRA_ISLANDS[-1][0]))]), int(top))
    t[tip[1], tip[0]] = 'k'
    wd.quadra_tip = tip


def build_sea(wd):
    land = wd.land
    sea = ~land
    d = dist_to(land, 12)
    shallow = sea & (d <= 2 + np.round(2 * value_noise(6, 60)))
    for pts in SHELVES:
        shallow |= sea & (polyline_dist(pts) <= 1.8 + 2.4 * value_noise(4, 61))
    lab, n = label(land, diag=True)
    sizes = np.bincount(lab.ravel())
    deep_land = np.zeros((H, W), bool)
    for (x, y) in ((283, 246), (352, 21), (316, 88)):          # Mideel, Round Island, Goblin Island
        k = lab[y, x]
        if k and sizes[k] < 4000:
            deep_land |= lab == k
    # Mideel's neighbouring eastern arcs too (keeps the Bronco away from Mideel)
    arcs = land & rect(250, 212, 362, 262)
    deep_land |= arcs
    # northern continent: deep water everywhere except the Bone Village shore
    kn = lab[80, 190]
    deep_land |= (lab == kn) & ~rect(166, 93, 232, 126)
    dd = dist_to(deep_land, 8)
    shallow &= ~(sea & (dd <= 4))
    wd.t[sea] = 'O'
    wd.t[shallow] = 'o'


# ----------------------------------------------------------------------------
# 8. regions
# ----------------------------------------------------------------------------

def build_regions(wd):
    t = wd.t
    reg = np.full((H, W), -1, np.int32)
    rid = {r: i for i, r in enumerate(REGION_IDS)}
    sea = np.isin(t, list(SEA))
    walk = np.isin(t, list(WALK))
    fixed = np.zeros((H, W), bool)
    # terrain-defined regions
    def fix(mask, name):
        m = mask & (reg < 0)
        reg[m] = rid[name]
        fixed[m] = True
    fix((t == 'x') & rect(270, 150, 310, 200), 'marsh')
    fix(np.isin(t, list('d')) & ellipse(151, 189, 13, 12), 'desert')
    fix(ellipse(151, 189, 16.5, 15.5) & wd.land & ~walk, 'desert')
    fix((t == 'f') & rect(166, 88, 226, 94), 'forest_north')
    fix(disk(169, 30, 9.6) & wd.land, 'crater_area')
    fix(disk(352, 21, 8.3) & wd.land, 'round_area')
    fix(np.any(wd.quadra_isles, axis=0), 'mideel_area')                        # the Quadra Magic islets
    # phase 1: seeds flood their own walkable component
    q = deque()
    for name, pts in REGION_SEEDS.items():
        for x, y in pts:
            if walk[y, x] and reg[y, x] < 0:
                reg[y, x] = rid[name]
                q.append((x, y))
            elif reg[y, x] < 0 and not sea[y, x]:
                reg[y, x] = rid[name]
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and walk[ny, nx] and reg[ny, nx] < 0:
                reg[ny, nx] = reg[y, x]
                q.append((nx, ny))
    # phase 2/3: everything else on land takes the nearest assigned land tile
    for through_sea in (False, True):
        q = deque((x, y) for y, x in zip(*np.nonzero((reg >= 0) & ~sea)))
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and reg[ny, nx] < 0 and (through_sea or not sea[ny, nx]):
                    reg[ny, nx] = reg[y, x]
                    q.append((nx, ny))
        if through_sea:
            break
    reg[sea] = rid['ocean']
    reg[reg < 0] = rid['ocean']
    return reg


# The world-map areas whose grassy coasts are sandy beaches: the areas with "Beach" formations in the Enemy
# Encounter FAQ (their tables are wm_<area>_beach in js/data/encounters_*.js; Kalm / Midgar share
# wm_midgar_beach, the Chocobo Farm grasslands wm_grasslands_beach, the Mythril Mine side Junon's).
BEACH_REGIONS = ('midgar_area', 'kalm_area', 'chocobo_farm_area', 'mythril_area', 'junon_area', 'temple_area',
                 'costa_area', 'desert_edge', 'gongaga_area', 'cosmo_area', 'nibel_area', 'rocket_area',
                 'wutai_area', 'bone_area', 'mideel_area')


def paint_beaches(wd, reg, locs, veh):
    """Grass / wasteland tiles on the sea shore of a beach area become sand ('s'), in patches (not every
    shore tile); rocky shores (hills, mountains, forest, jungle, cities) and anything locked stay as they are,
    and so do the locations' footprints and the vehicles' start tiles. Sand is walkable, buggy- and
    chocobo-passable and landable, so no route changes."""
    t = wd.t
    sea = np.isin(t, list('oO'))
    shore = dilate(sea, 1, diag=False) & ~sea
    rid = {r: i for i, r in enumerate(REGION_IDS)}
    area = np.isin(reg, [rid[r] for r in BEACH_REGIONS])
    keep = wd.lock.copy()
    for l in locs:
        keep[max(0, l['fy'] - 1):l['fy'] + l['h'] + 1, max(0, l['fx'] - 1):l['fx'] + l['w'] + 1] = True
    for x, y in veh.values():
        keep[y, x] = True
    beach = shore & area & np.isin(t, list('gw')) & ~keep & (value_noise(4, 71) > 0.32)
    t[beach] = 's'
    return int(beach.sum())


# ----------------------------------------------------------------------------
# 9. validation
# ----------------------------------------------------------------------------

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def flood(t, starts, passable, diag):
    ok = np.isin(t, list(passable))
    seen = np.zeros((H, W), bool)
    q = deque()
    for x, y in starts:
        if ok[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((x, y))
    nb = N8 if diag else N4
    while q:
        x, y = q.popleft()
        for dx, dy in nb:
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and ok[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((nx, ny))
    return seen


def bronco_reach(t, start, diag):
    water = flood(t, [start], 'o', diag)
    walk = np.isin(t, list(WALK))
    nb = N8 if diag else N4
    land_starts = []
    ys, xs = np.nonzero(water)
    for y, x in zip(ys, xs):
        for dx, dy in nb:
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and walk[ny, nx]:
                land_starts.append((nx, ny))
    return water, flood(t, land_starts, WALK, diag)


def validate(wd, locs, veh):
    t = wd.t
    L = {l['id']: (l['x'], l['y']) for l in locs}
    results = []

    def check(desc, ok):
        results.append((ok, desc))

    def comp(start, passable, diag):
        return flood(t, [start], passable, diag)

    def has(m, lid):
        x, y = L[lid]
        return bool(m[y, x])

    # grid sanity
    used = set(np.unique(t).tolist())
    check('grid is %dx%d and only uses legend codes %s' % (W, H, sorted(used - set(LEGEND)) or ''),
          t.shape == (H, W) and used <= set(LEGEND))
    ids = [l['id'] for l in locs]
    check('location ids unique', len(ids) == len(set(ids)))
    # entry tiles walkable
    bad = [l['id'] for l in locs if l['id'] != 'gelnika' and t[l['y'], l['x']] not in WALK]
    check('all location entry tiles walkable (except gelnika) %s' % (bad or ''), not bad)
    check('gelnika sits in deep ocean', t[L['gelnika'][1], L['gelnika'][0]] == 'O')

    def inc(start_id, ids, passable=WALK, start=None, label=None):
        c = comp(start or L[start_id], passable, False)          # 4-neighbour = strict for "reachable"
        for i in ids:
            check('%s -> %s reachable' % (label or start_id, i), has(c, i))

    def exc(start_id, ids, passable=WALK, start=None, label=None):
        c = comp(start or L[start_id], passable, True)           # 8-neighbour = strict for "blocked"
        for i in ids:
            check('%s -/-> %s blocked' % (label or start_id, i), not has(c, i))

    inc('midgar', ['kalm', 'chocobo_farm', 'mythril_mine_e'])
    exc('midgar', ['junon', 'fort_condor', 'mythril_mine_w'])
    inc('mythril_mine_w', ['junon', 'fort_condor'])
    exc('mythril_mine_w', ['midgar', 'kalm', 'chocobo_farm'])
    inc('costa_del_sol', ['mt_corel'])
    exc('costa_del_sol', ['north_corel', 'rocket_town', 'gongaga', 'weapon_seller'])
    exc('north_corel', ['costa_del_sol', 'gold_saucer', 'nibelheim', 'rocket_town', 'weapon_seller'])
    bx, by = veh['buggy']
    inc(None, ['gongaga', 'cosmo_canyon', 'weapon_seller'], BUGGY, (bx, by), 'buggy(walk+r)')
    exc(None, ['gold_saucer', 'corel_prison', 'north_corel', 'costa_del_sol', 'rocket_town'], BUGGY,
        (bx, by), 'buggy(walk+r)')
    exc(None, ['gongaga', 'cosmo_canyon'], WALK, (bx, by), 'buggy start on foot')
    inc('cosmo_canyon', ['nibelheim', 'mt_nibel_e'])
    exc('cosmo_canyon', ['rocket_town', 'mt_nibel_w', 'north_corel', 'gold_saucer'])
    inc('mt_nibel_w', ['rocket_town'])
    exc('mt_nibel_w', ['nibelheim'])
    exc('bone_village', ['forgotten_capital', 'sleeping_forest_n'])
    inc('bone_village', ['sleeping_forest'])
    inc('sleeping_forest_n', ['forgotten_capital', 'corral_valley'])
    exc('sleeping_forest_n', ['icicle_inn', 'corral_valley_n', 'bone_village'])
    inc('corral_valley_n', ['icicle_inn', 'chocobo_sage'])
    exc('corral_valley_n', ['northern_crater', 'forgotten_capital'])
    inc('wutai', ['da_chao'])
    # Tiny Bronco
    water4, land4 = bronco_reach(t, veh['bronco'], False)
    water8, land8 = bronco_reach(t, veh['bronco'], True)
    for i in ['rocket_town', 'wutai', 'temple_of_ancients', 'bone_village', 'costa_del_sol', 'junon']:
        check('bronco(o + landing) -> %s reachable' % i, has(land4, i))
    for i in ['mideel', 'round_island', 'northern_crater', 'forgotten_capital', 'icicle_inn',
              'gold_saucer', 'corel_prison', 'goblin_island', 'materia_cave_e']:
        check('bronco(o + landing) -/-> %s blocked' % i, not has(land8, i))
    # chocobo-only spots: the Quadra Magic islands (blue / black / gold from Mideel's island; not from the
    # mainland without the Highwind; never green, on foot or the buggy)
    RIVER = WALK | set('ro')
    MOUNT = WALK | set('mh')
    inc('nibelheim', ['lucrecia_cave'], RIVER, label='blue chocobo from nibelheim')
    inc('nibelheim', ['lucrecia_cave'], MOUNT, label='green chocobo from nibelheim')
    inc('mideel', ['materia_cave_e'], RIVER, label='blue chocobo from mideel')
    inc('mideel', ['materia_cave_e'], RIVER | set('mh'), label='black chocobo from mideel')
    exc('mideel', ['materia_cave_e'], MOUNT, label='green chocobo from mideel')
    exc('mideel', ['materia_cave_e'], BUGGY, label='buggy / on foot from mideel')
    exc('chocobo_farm', ['materia_cave_e', 'mideel'], RIVER, label='blue chocobo from the farm')
    qi = np.any(wd.quadra_isles, axis=0)
    check('the Quadra Magic cave islet has no Highwind landing tile', not np.isin(t[wd.quadra_isles[-1]], list('gsdnwxpch')).any())
    check('the Quadra Magic cave is on the northern tip of the last islet', L['materia_cave_e'][1] == int(np.nonzero(wd.quadra_isles[-1])[0].min()))
    check('three separate Quadra Magic islets', label(qi, diag=True)[1] == 3)
    near_deep = False
    ys, xs = np.nonzero(qi)
    for y, x in zip(ys, xs):
        for dx, dy in N8:
            if t[y + dy, x + dx] == 'O':
                near_deep = True
    check('the Quadra Magic islands are ringed by shallow water (no submarine landing)', not near_deep)
    # intentionally unreachable
    all_walk = np.zeros((H, W), bool)
    for l in locs:
        if l['id'] in UNREACHABLE:
            continue
        all_walk |= flood(t, [(l['x'], l['y'])], WALK, True)
    for lid in sorted(UNREACHABLE):
        if lid == 'gelnika':
            continue
        check('%s not walkable-connected to any story location' % lid, not has(all_walk, lid))
    # vehicles
    check('bronco start on shallow sea', t[veh['bronco'][1], veh['bronco'][0]] == 'o')
    check('submarine start on deep sea', t[veh['submarine'][1], veh['submarine'][0]] == 'O')
    check('buggy start walkable', t[by, bx] in WALK)
    hx, hy = veh['highwind']
    check('highwind start on grass', t[hy, hx] == 'g')
    return results, land4


# ----------------------------------------------------------------------------
# 10. output
# ----------------------------------------------------------------------------

def nearest(t, x, y, pred, maxr=40):
    best = None
    for r in range(0, maxr):
        for yy in range(y - r, y + r + 1):
            for xx in range(x - r, x + r + 1):
                if max(abs(xx - x), abs(yy - y)) != r:
                    continue
                if 0 <= xx < W and 0 <= yy < H and pred(xx, yy):
                    d = (xx - x) ** 2 + (yy - y) ** 2
                    if best is None or d < best[0]:
                        best = (d, xx, yy)
        if best:
            return best[1], best[2]
    return None


def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def write_js(wd, reg, locs, tracks, veh):
    rows = [''.join(r) for r in wd.t]
    rrows = [''.join(REGION_CHARS[v] for v in r) for r in reg]
    out = []
    out.append('// generated by tools/build_world.py -- do not edit by hand, re-run the generator')
    out.append('// FF7 world map: %dx%d tiles (16 px), wraps horizontally and vertically.' % (W, H))
    out.append('// Location x,y = entry tile; fx,fy,w,h = drawing footprint (top-left + size).')
    out.append('FF7.data.world = {')
    out.append('  w: %d, h: %d,' % (W, H))
    out.append('  legend: { %s },' % ', '.join("'%s':'%s'" % (k, v) for k, v in LEGEND.items()))
    out.append("  walk: '%s',          // passable on foot (plus location tiles)" % ''.join(sorted(WALK)))
    out.append("  buggy: '%s',        // buggy / blue chocobo: walk + shallow river" % ''.join(sorted(BUGGY)))
    out.append("  bronco: 'o',                   // Tiny Bronco water; it can land on adjacent walkable tiles")
    out.append('  rows: [')
    for r in rows:
        out.append("    '%s'," % r)
    out.append('  ],')
    out.append('  regions: {')
    out.append('    legend: { %s },' % ', '.join("'%s':'%s'" % (REGION_CHARS[i], r) for i, r in enumerate(REGION_IDS)))
    out.append('    rows: [')
    for r in rrows:
        out.append("      '%s'," % r)
    out.append('    ],')
    out.append('    // suggested encounter tables: try encounters[region] + terrainSuffix[tile], else encounters[region]')
    out.append('    encounters: { %s },' % ', '.join('%s:%s' % (k, js_str(v)) for k, v in REGION_ENCOUNTERS.items()))
    out.append('    terrainSuffix: { %s },' % ', '.join("'%s':%s" % (k, js_str(v)) for k, v in TERRAIN_SUFFIX.items()))
    out.append('  },')
    out.append('  locations: [')
    for l in locs:
        out.append("    { id:%s, name:%s, x:%d, y:%d, w:%d, h:%d, fx:%d, fy:%d, icon:%s, region:%s },"
                   % (js_str(l['id']), js_str(l['name']), l['x'], l['y'], l['w'], l['h'], l['fx'], l['fy'],
                      js_str(l['icon']), js_str(l['region'])))
    out.append('  ],')
    out.append('  chocoboTracks: [')
    for tr in tracks:
        out.append("    { x:%d, y:%d, region:%s, quality:%s }," % (tr[0], tr[1], js_str(tr[2]), js_str(tr[3])))
    out.append('  ],')
    out.append('  vehicleStarts: { %s },' % ', '.join('%s:{x:%d,y:%d}' % (k, v[0], v[1]) for k, v in veh.items()))
    out.append('};')
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')


def render(wd, locs, tracks, veh, scale, path, labels=False, crop=None):
    t = wd.t
    img = np.zeros((H, W, 3), np.uint8)
    for k, c in COLORS.items():
        img[t == k] = c
    # light relief shading on land for readability
    im = Image.fromarray(img).resize((W * scale, H * scale), Image.NEAREST)
    d = ImageDraw.Draw(im)
    s = scale
    for l in locs:
        fx, fy, w, h = l['fx'], l['fy'], l['w'], l['h']
        if w > 1 or h > 1:
            d.rectangle([fx * s, fy * s, (fx + w) * s - 1, (fy + h) * s - 1], outline=(255, 255, 255))
        x, y = l['x'], l['y']
        col = (255, 60, 60) if l['id'] in UNREACHABLE else (255, 255, 255)
        d.rectangle([x * s - 1, y * s - 1, x * s + s, y * s + s], fill=col, outline=(0, 0, 0))
        if labels:
            d.text((x * s + s + 2, y * s - 4), l['id'], fill=(255, 255, 0))
    for x, y, _, _ in tracks:
        d.ellipse([x * s - 1, y * s - 1, x * s + s, y * s + s], fill=(255, 220, 0), outline=(90, 60, 0))
    for k, (x, y) in veh.items():
        d.rectangle([x * s - 1, y * s - 1, x * s + s, y * s + s], fill=(255, 0, 255), outline=(0, 0, 0))
        if labels:
            d.text((x * s + s + 2, y * s + 2), k, fill=(255, 128, 255))
    if crop:
        x0, y0, x1, y1 = crop
        im = im.crop((x0 * s, y0 * s, x1 * s, y1 * s))
    im.save(path)


def write_md(locs, results, tracks, veh, stats):
    L = []
    L.append('# World map data (`js/data/world_map.js`)')
    L.append('')
    L.append('Generated by `python tools/build_world.py` (deterministic, re-runnable). Do not hand-edit the JS;')
    L.append('change the feature definitions in the generator instead. Preview: `docs/world_preview.png`')
    L.append('(2 px per tile; white squares = location entry tiles, red = intentionally unreachable on foot,')
    L.append('yellow dots = chocobo tracks, magenta = vehicle starts, white boxes = drawing footprints).')
    L.append('')
    L.append('## Grid')
    L.append('')
    L.append('* %d x %d tiles, 16 px each; the world wraps horizontally **and** vertically.' % (W, H))
    L.append('* Source geography: `references/maps/world_map_ffj.gif` cropped to y=15..355 and scaled x0.8')
    L.append('  (1 tile = 1.25 reference px, no aspect distortion); relief shading -> hills/mountains;')
    L.append('  story walls, rivers, biomes and structures are hand-authored in tile coordinates in the generator.')
    L.append('* `rows[y][x]` = terrain code, `regions.rows[y][x]` = encounter-region code.')
    L.append('')
    L.append('## Terrain legend')
    L.append('')
    L.append('| code | terrain | on foot | buggy / blue chocobo | Tiny Bronco | notes |')
    L.append('|---|---|---|---|---|---|')
    notes = {
        'O': 'deep ocean: Highwind, submarine (can dive)', 'o': 'coastal shallows: Tiny Bronco water',
        'r': 'shallow river: buggy & blue/black/gold chocobo ford it', 'R': 'deep river / lake: boats, air only',
        'g': 'Highwind may land', 'f': '', 'j': '', 'h': 'walkable hills', 'm': 'blocked (air only)',
        'M': 'high peaks, blocked (air only)', 'd': 'Corel Desert (+ the small walled desert north of Corel)', 's': 'beach', 'n': 'snow field',
        'i': 'glacier, blocked', 'w': 'barren wasteland', 'x': 'Midgar Zolom marsh', 'k': 'rocky canyon / cave mouths',
        'c': 'Northern Crater floor', 'C': 'Midgar / Junon structure, blocked', 'b': 'walkable bridge',
        'p': 'road / rail', 'L': 'lava / Lifestream steam vents (crater floor), blocked',
    }
    for k, v in LEGEND.items():
        L.append('| `%s` | %s | %s | %s | %s | %s |' % (
            k, v, 'yes' if k in WALK else 'no', 'yes' if k in BUGGY else 'no', 'yes' if k == 'o' else 'no',
            notes.get(k, '')))
    L.append('')
    L.append('Tile counts: ' + ', '.join('`%s` %d' % (k, v) for k, v in stats))
    L.append('')
    L.append('## Locations')
    L.append('')
    L.append('`x,y` = entry tile (step on it to enter). `fx,fy,w,h` = drawing footprint (top-left tile + size).')
    L.append('')
    L.append('| id | name | x | y | footprint | icon | region | notes |')
    L.append('|---|---|---|---|---|---|---|---|')
    for l in locs:
        L.append('| `%s` | %s | %d | %d | %d,%d %dx%d | %s | %s | %s |' % (
            l['id'], l['name'], l['x'], l['y'], l['fx'], l['fy'], l['w'], l['h'], l['icon'], l['region'],
            UNREACHABLE.get(l['id'], '')))
    L.append('')
    L.append('## Chocobo tracks')
    L.append('')
    L.append('| x | y | region | best quality | (range per the chocobo guides) |')
    L.append('|---|---|---|---|---|')
    rng = {'chocobo_farm_area': 'weak - poor', 'junon_area': 'poor - fair', 'desert_edge': 'average - good',
           'rocket_area': 'so-so - great', 'wutai_area': 'fair - average', 'icicle_area': 'weak - wonderful',
           'mideel_area': 'fair - great'}
    for x, y, r, q in tracks:
        L.append('| %d | %d | %s | %s | %s |' % (x, y, r, q, rng.get(r, '')))
    L.append('')
    L.append('## Vehicle starts')
    L.append('')
    vnotes = {'buggy': 'south of the Corel Desert walls (after Corel Prison)',
              'bronco': "shallow water off Rocket Town's coast (after Rocket Town)",
              'highwind': 'grass next to Junon (disc 2)',
              'submarine': 'deep water off Junon (disc 2)'}
    for k, (x, y) in veh.items():
        L.append('* `%s`: (%d, %d) - %s' % (k, x, y, vnotes.get(k, '')))
    L.append('')
    L.append('## Regions (encounter zones)')
    L.append('')
    L.append('`regions.rows` uses one char per tile; `regions.legend` maps char -> region id. Every tile has a')
    L.append('region; all sea is `ocean`. Land regions are grown from seed points through their walkable')
    L.append('component (so they respect the gating walls), then mountains/rivers take the nearest region.')
    L.append('Marsh tiles, the Corel Desert, the Sleeping Forest band, the crater and Round Island are fixed by terrain.')
    L.append('')
    L.append('| char | region | suggested encounter table (`regions.encounters`) |')
    L.append('|---|---|---|')
    for i, r in enumerate(REGION_IDS):
        L.append('| `%s` | %s | `%s` |' % (REGION_CHARS[i], r, REGION_ENCOUNTERS[r]))
    L.append('')
    L.append('`regions.terrainSuffix` maps a tile code to a table suffix (`s` -> `_beach`, `f` -> `_forest`,')
    L.append('`j` -> `_jungle`, `k` -> `_canyon`, `w` -> `_dirt`, `d` -> `_desert`, `g`/`h` -> `_grass`). Suggested lookup:')
    L.append('`encounters[region] + terrainSuffix[tile]` if that table exists, else `encounters[region]`, else none.')
    L.append('Exceptions worth special-casing: beaches of `chocobo_farm_area` -> `wm_grasslands_beach`, of `kalm_area` /')
    L.append('`midgar_area` -> `wm_midgar_beach`; `d` tiles of `corel_area` (desert north of Corel) -> `wm_corel_desert_north`;')
    L.append('`wm_seafloor` is intentionally empty (no battles at sea / in the submarine).')
    L.append('')
    L.append('## Story gating')
    L.append('')
    L.append('Walls are locked mountain ranges (`m` with an `M` core) at least 2 tiles thick, so they block')
    L.append('8-neighbour (diagonal) movement too. Checks below use 4-neighbour flood fills for "reachable"')
    L.append('and 8-neighbour flood fills for "blocked" (the strict choice for each).')
    L.append('')
    L.append('1. **Eastern continent.** An E-W range runs from the west coast just south of Midgar to a N-S range')
    L.append('   which continues south to a range reaching the east coast. North/east of it: Midgar (entry on its')
    L.append('   east side), Kalm, the Chocobo Farm grasslands and the Midgar Zolom marsh. The only walking link to the')
    L.append('   Junon / Fort Condor side is the Mythril Mine (`mythril_mine_e` marsh side -> `mythril_mine_w`).')
    L.append('2. **Western continent.** Costa del Sol sits in a pocket closed by the Mt. Corel range (`mt_corel` at its')
    L.append('   west edge; a river with a bridge on the way). North Corel lies in a walled valley beyond (reached only')
    L.append('   through the Mt. Corel dungeon). The Corel Desert (Gold Saucer, Corel Prison) is completely ringed by')
    L.append('   cliffs. South of it is the buggy zone (`vehicleStarts.buggy`, Weapon Seller\'s house, chocobo tracks')
    L.append('   on the east peninsula); shallow rivers `r` from Lucrecia\'s lake split it from Cosmo Canyon (west) and')
    L.append('   Gongaga (south) - buggy only. Cosmo Canyon connects on foot north to the Nibelheim valley; the Mt. Nibel')
    L.append('   range (west coast -> spine) separates it from Rocket Town, passable only via `mt_nibel_e` -> `mt_nibel_w`.')
    L.append('3. **Northern continent.** Bone Village shore (the only shallow coast of the continent) -> the Sleeping')
    L.append('   Forest band with a ridge behind it (`sleeping_forest` -> `sleeping_forest_n`) -> Forgotten Capital valley')
    L.append('   -> Corral Valley (`corral_valley` -> `corral_valley_n`) -> snowy corridor west to Icicle Inn and east to')
    L.append('   the Chocobo Sage. North of that everything is glacier / peaks; the crater is ringed by `M`.')
    L.append('4. **Sea.** Shallows (`o`) follow most coasts plus shelves linking Rocket Town, Wutai, the Bone Village')
    L.append('   shore, Costa del Sol, Junon and the Temple island. Mideel (+ its eastern arcs), Round Island, Goblin')
    L.append('   Island and the rest of the northern continent are surrounded by deep water only.')
    L.append('5. Paired entrances (`mythril_mine_e/w`, `mt_nibel_e/w`, `sleeping_forest/_n`, `corral_valley/_n`,')
    L.append('   `mt_corel` -> North Corel) are where the engine should put the player after the field dungeon.')
    L.append('')
    L.append('## Design notes / deviations')
    L.append('')
    L.append('* Positions follow the dots of `world_map_ffj.gif` (and `map.jpg` where the gif is ambiguous); a few are')
    L.append('  nudged by 2-6 tiles so the gating walls fit (e.g. North Corel sits between the two references).')
    L.append('* Extra ids beyond the requested list: `sleeping_forest_n`, `corral_valley_n` (exit tiles of those field')
    L.append('  maps), `weapon_seller` (the single house south of the Gold Saucer - needed for the Keystone quest),')
    L.append('  `lucrecia_cave`. There is no `materia_cave_s`: FF7 has four chocobo-only caves = Quadra Magic')
    L.append('  (`materia_cave_e`, the last of three forest islands west then north of Mideel, in a shallow channel')
    L.append('  that starts at the western lobe of Mideel\'s island: bring a blue / black chocobo in the Highwind, or')
    L.append('  ride a gold one), Mime (`materia_cave_w`, Wutai island),')
    L.append('  HP<->MP (`materia_cave_n`, walled desert north of North Corel) and Knights of the Round (`knights_of_round`).')
    L.append('* `ancient_forest` is placed on a walled plateau next to Cosmo Canyon, as the reference walkthrough says')
    L.append('  ("the little green bulb ... on a canyon near Cosmo Canyon"; reached by mountain chocobo or after Ultimate WEAPON).')
    L.append('* The Temple of the Ancients island was cut from the eastern continent (thin link in the reference) so it')
    L.append('  is a separate island reached by boat, as in FF7. The top of the northern fjord was filled so the Corral')
    L.append('  Valley exit links the Icicle plateau and the Chocobo Sage; the rest of the fjord separates Icicle / Capital.')
    L.append('* Goblin Island, Round Island and the Quadra Magic island are hidden under labels in the reference and')
    L.append('  were drawn by hand at their FF7 positions.')
    L.append('* The engine may let the Tiny Bronco use rivers (FF7 lets it sail the river through the western continent);')
    L.append('  the validation only uses `o`.')
    L.append('')
    L.append('## Validation (last run)')
    L.append('')
    for ok, desc in results:
        L.append('* [%s] %s' % ('x' if ok else ' ', desc))
    L.append('')
    with open(OUT_MD, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L) + '\n')


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def main(argv):
    debug_dir = None
    if '--debug-dir' in argv:
        debug_dir = argv[argv.index('--debug-dir') + 1]
    wd = build()
    locs = place_locations(wd)
    # Lucrecia's waterfall cave (128,177) sits in the spine's peaks above the lake: a shallow stream from
    # the east bank's hills (blue / black / gold chocobos wade in) and a mountain shoulder from the west
    # (green); nobody walks in
    for x in range(128, 132):
        wd.set(x, 178, 'r')
    wd.set(127, 177, 'm')
    L = {l['id']: (l['x'], l['y']) for l in locs}
    # chocobo tracks must be on walkable ground
    for x, y, _, _ in CHOCOBO_TRACKS:
        if wd.t[y, x] not in WALK:
            wd.t[y, x] = 'n' if wd.snowy[y, x] else 'g'
    buggy = (150, 215)
    wd.set(buggy[0], buggy[1], 'g')
    # connectivity inside each story zone (carve passes through relief mountains only)
    need = [
        ('midgar', 'kalm', WALK), ('kalm', 'chocobo_farm', WALK), ('chocobo_farm', 'mythril_mine_e', WALK),
        ('midgar', 'mythril_mine_e', WALK),
        ('mythril_mine_w', 'junon', WALK), ('mythril_mine_w', 'fort_condor', WALK),
        ('costa_del_sol', 'mt_corel', WALK),
        ('cosmo_canyon', 'nibelheim', WALK), ('nibelheim', 'mt_nibel_e', WALK),
        ('mt_nibel_w', 'rocket_town', WALK),
        ('bone_village', 'sleeping_forest', WALK), ('sleeping_forest_n', 'forgotten_capital', WALK),
        ('forgotten_capital', 'corral_valley', WALK), ('corral_valley_n', 'icicle_inn', WALK),
        ('corral_valley_n', 'chocobo_sage', WALK), ('wutai', 'da_chao', WALK),
        ((buggy), 'weapon_seller', WALK), ((buggy), 'gongaga', BUGGY), ((buggy), 'cosmo_canyon', BUGGY),
    ]
    track_home = {'chocobo_farm_area': 'chocobo_farm', 'junon_area': 'junon', 'desert_edge': buggy,
                  'rocket_area': 'rocket_town', 'wutai_area': 'wutai', 'icicle_area': 'icicle_inn',
                  'mideel_area': 'mideel'}
    for x, y, r, _ in CHOCOBO_TRACKS:
        need.append((track_home[r], (x, y), WALK))
    for a, b, pas in need:
        pa = L[a] if isinstance(a, str) else a
        pb = L[b] if isinstance(b, str) else b
        c = carve_path(wd, pa, pb, pas)
        if c is None:
            print('  !! no path possible %s -> %s' % (a, b))
        elif c:
            print('  carved %d tiles %s -> %s' % (c, a, b))
    build_sea(wd)
    quadra_islands(wd)
    for l in locs:
        if l['id'] == 'materia_cave_e':
            l.update(x=wd.quadra_tip[0], y=wd.quadra_tip[1], fx=wd.quadra_tip[0], fy=wd.quadra_tip[1])
    L = {l['id']: (l['x'], l['y']) for l in locs}
    t = wd.t
    # vehicle starts
    walk = np.isin(t, list(WALK))
    rk = flood(t, [L['rocket_town']], WALK, False)
    rx, ry = L['rocket_town']
    bronco = nearest(t, rx, ry, lambda x, y: t[y, x] == 'o' and any(
        0 <= x + dx < W and 0 <= y + dy < H and rk[y + dy, x + dx] for dx, dy in N4))
    jx, jy = L['junon']
    sub = nearest(t, jx - 8, jy, lambda x, y: t[y, x] == 'O' and not (x > 216 and x < 240))
    hw = nearest(t, jx + 5, jy - 4, lambda x, y: t[y, x] == 'g')
    veh = {'buggy': buggy, 'bronco': bronco, 'highwind': hw, 'submarine': sub}
    reg = build_regions(wd)
    print('  beaches: %d shore tiles made sand' % paint_beaches(wd, reg, locs, veh))
    for l in locs:
        l['region'] = REGION_IDS[reg[l['y'], l['x']]]
    tracks = [(x, y, REGION_IDS[reg[y, x]], q) for x, y, _, q in CHOCOBO_TRACKS]
    results, _ = validate(wd, locs, veh)
    # report
    ok_all = all(ok for ok, _ in results)
    print('World %dx%d  locations=%d  tracks=%d' % (W, H, len(locs), len(tracks)))
    for ok, desc in results:
        print('  [%s] %s' % ('OK' if ok else 'FAIL', desc))
    print('ALL CHECKS PASSED' if ok_all else 'SOME CHECKS FAILED')
    for tr, (x, y, r, q) in zip(CHOCOBO_TRACKS, tracks):
        if tr[2] != r:
            print('  note: track at (%d,%d) is in region %s (expected %s)' % (x, y, r, tr[2]))
    vals, cnts = np.unique(t, return_counts=True)
    stats = sorted(zip(vals.tolist(), cnts.tolist()), key=lambda kv: -kv[1])
    write_js(wd, reg, locs, tracks, veh)
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    render(wd, locs, tracks, veh, 2, OUT_PNG)
    write_md(locs, results, tracks, veh, stats)
    if debug_dir:
        os.makedirs(debug_dir, exist_ok=True)
        render(wd, locs, tracks, veh, 3, os.path.join(debug_dir, 'world_big.png'), labels=True)
        for name, crop in (('east', (205, 105, 350, 225)), ('west', (60, 105, 195, 250)),
                           ('north', (125, 5, 235, 125)), ('wutai', (20, 50, 110, 215)),
                           ('south', (180, 180, 370, 265))):
            render(wd, locs, tracks, veh, 6, os.path.join(debug_dir, 'z_%s.png' % name), labels=True, crop=crop)
        img = np.zeros((H, W, 3), np.uint8)
        pal = np.random.RandomState(3).randint(40, 255, (len(REGION_IDS), 3))
        pal[-1] = (20, 30, 80)
        img[:] = pal[reg]
        Image.fromarray(img.astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(
            os.path.join(debug_dir, 'regions.png'))
    print('wrote', os.path.relpath(OUT_JS, ROOT), os.path.relpath(OUT_PNG, ROOT), os.path.relpath(OUT_MD, ROOT))
    return 0 if ok_all else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))


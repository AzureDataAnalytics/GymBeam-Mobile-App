import numpy as np
import Part
from FreeCAD import Vector
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.path import Path
from matplotlib.patches import PathPatch
from matplotlib.backends.backend_pdf import PdfPages

STEP = "hardware/top-arm/cad/gymbeam-top-arm-v2.1.step"
OUT = "hardware/top-arm/drawings/gymbeam-top-arm-v2.1-inside-dimensions"
FILL = ["#b9cdec", "#f6cfa3"]
EDGE = ["#1f5fae", "#c25e00"]
GAP = "#0a7d32"
MAT = "#333333"

shape = Part.Shape(); shape.read(STEP)
bb = shape.BoundBox
D = np.array([bb.XMin, bb.YMin, bb.ZMin])
solids = shape.Solids
NORM = {"X": Vector(1, 0, 0), "Y": Vector(0, 1, 0), "Z": Vector(0, 0, 1)}
AX2D = {"X": (1, 2), "Y": (0, 2), "Z": (0, 1)}
AXN = "XYZ"


def section_faces(axis, v):
    out = []
    for si, so in enumerate(solids):
        for nudge in (0, 0.03, -0.03, 0.07, -0.07):
            ws = so.slice(NORM[axis], v + nudge + D[AXN.index(axis)])
            if not ws:
                break
            try:
                f = Part.makeFace(ws, "Part::FaceMakerBullseye")
                out += [(si, x) for x in f.Faces]
                break
            except Exception:
                continue
    return out


def poly(w, axis):
    pts = np.array([[p.x, p.y, p.z] for p in w.discretize(Distance=0.08)]) - D
    i, j = AX2D[axis]
    return pts[:, [i, j]]


def draw_section(ax, axis, v, title):
    faces = section_faces(axis, v)
    for si, f in faces:
        verts, codes = [], []
        for w in f.Wires:
            p = poly(w, axis)
            area = 0.5 * np.sum(p[:-1, 0] * p[1:, 1] - p[1:, 0] * p[:-1, 1])
            outer = w.isSame(f.OuterWire)
            if (area < 0) == outer:
                p = p[::-1]
            verts += list(p) + [p[0]]
            codes += [Path.MOVETO] + [Path.LINETO] * (len(p) - 1) + [Path.CLOSEPOLY]
        ax.add_patch(PathPatch(Path(verts, codes), fc=FILL[si], ec=EDGE[si], lw=0.6, hatch="////", alpha=1))
    ax.set_title(title, fontsize=9, weight="bold")
    ax.set_aspect("equal"); ax.axis("off")
    return faces


def material_segments(faces, axis, line_axis, at):
    """Segments of material along a scan line in section coords. line_axis: 'h' or 'v'."""
    i, j = AX2D[axis]
    p1 = np.zeros(3); p2 = np.zeros(3)
    p1[AXN.index(axis)] = p2[AXN.index(axis)] = 0
    segs = []
    for si, f in faces:
        plane_val = f.Vertexes[0].Point[AXN.index(axis)] if f.Vertexes else 0
        a = np.zeros(3); b = np.zeros(3)
        a[AXN.index(axis)] = b[AXN.index(axis)] = plane_val
        if line_axis == "h":
            a[i], b[i] = -500, 500
            a[j] = b[j] = at + D[j]
        else:
            a[j], b[j] = -500, 500
            a[i] = b[i] = at + D[i]
        ln = Part.makeLine(Vector(*a), Vector(*b))
        try:
            com = f.common(ln)
        except Exception:
            continue
        k = i if line_axis == "h" else j
        for e in com.Edges:
            s0 = e.Vertexes[0].Point[k] - D[k]
            s1 = e.Vertexes[-1].Point[k] - D[k]
            segs.append((min(s0, s1), max(s0, s1), si))
    segs.sort()
    merged = []
    for s in segs:
        if merged and s[0] <= merged[-1][1] + 0.01:
            merged[-1] = (merged[-1][0], max(merged[-1][1], s[1]), merged[-1][2])
        else:
            merged.append(s)
    return merged


def chain(ax, faces, axis, line_axis, at, min_txt=0.0):
    segs = material_segments(faces, axis, line_axis, at)
    if not segs:
        return
    pieces = []
    for k, (s0, s1, si) in enumerate(segs):
        pieces.append((s0, s1, "mat"))
        if k + 1 < len(segs):
            pieces.append((s1, segs[k + 1][0], "gap"))
    lo, hi = segs[0][0], segs[-1][1]
    if line_axis == "h":
        ax.plot([lo - 2, hi + 2], [at, at], color="#666", lw=0.4, ls=(0, (6, 2, 1, 2)))
    else:
        ax.plot([at, at], [lo - 2, hi + 2], color="#666", lw=0.4, ls=(0, (6, 2, 1, 2)))
    alt = 0
    for s0, s1, kind in pieces:
        L = s1 - s0
        if L < 0.05:
            continue
        col = GAP if kind == "gap" else MAT
        if line_axis == "h":
            q1, q2 = (s0, at), (s1, at)
        else:
            q1, q2 = (at, s0), (at, s1)
        ax.annotate("", q1, q2, arrowprops=dict(arrowstyle="<|-|>", color=col, lw=0.5 if kind == "mat" else 0.8,
                                                 shrinkA=0, shrinkB=0, mutation_scale=4))
        mid = (s0 + s1) / 2
        small = L < 4.5
        off = (1.3 + (1.6 if (small and alt % 2) else 0)) * (1 if alt % 2 == 0 or not small else -1)
        if small:
            alt += 1
        txt = "%.2f" % L
        fw = "bold" if kind == "gap" else "normal"
        fs = 6 if kind == "gap" else 5.2
        if line_axis == "h":
            ax.text(mid, at + off, txt, ha="center", va="center", fontsize=fs, color=col, weight=fw,
                    bbox=dict(fc="white", ec="none", pad=0.15, alpha=0.85))
        else:
            ax.text(at + off, mid, txt, ha="center", va="center", fontsize=fs, color=col, weight=fw, rotation=90,
                    bbox=dict(fc="white", ec="none", pad=0.15, alpha=0.85))
    return pieces


def window_labels(ax, faces, axis, min_size=8.0):
    rows = []
    i, j = AX2D[axis]
    for si, f in faces:
        for w in f.Wires:
            if w.isSame(f.OuterWire):
                continue
            b = w.BoundBox
            lo = np.array([b.XMin, b.YMin, b.ZMin]) - D
            hi = np.array([b.XMax, b.YMax, b.ZMax]) - D
            sz = hi - lo
            if max(sz[i], sz[j]) < min_size:
                continue
            cx, cy = lo[i] + 0.73 * (hi[i] - lo[i]), lo[j] + 0.72 * (hi[j] - lo[j])
            ax.text(cx, cy, "opening\n%.2f \u00d7 %.2f" % (sz[i], sz[j]), ha="center", va="center",
                    fontsize=6.5, color=GAP, weight="bold", bbox=dict(fc="white", ec=GAP, lw=0.4, pad=0.8))
            rows.append((sz[i], sz[j], lo, hi))
    return rows


def frame(ax, axis, pad=6):
    i, j = AX2D[axis]
    lo = np.array([0, 0, 0]); hi = np.array([bb.XLength, bb.YLength, bb.ZLength])
    ax.set_xlim(lo[i] - pad, hi[i] + pad); ax.set_ylim(lo[j] - pad, hi[j] + pad)
    n = "XYZ"
    ax.annotate("", (lo[i] - pad + 1, lo[j] - pad + 1), (lo[i] - pad + 7, lo[j] - pad + 1),
                arrowprops=dict(arrowstyle="<|-", lw=0.6, mutation_scale=5))
    ax.annotate("", (lo[i] - pad + 1, lo[j] - pad + 1), (lo[i] - pad + 1, lo[j] - pad + 7),
                arrowprops=dict(arrowstyle="<|-", lw=0.6, mutation_scale=5))
    ax.text(lo[i] - pad + 7.8, lo[j] - pad + 1, "+" + n[i], fontsize=6, va="center")
    ax.text(lo[i] - pad + 1, lo[j] - pad + 8, "+" + n[j], fontsize=6, ha="center")


# section plan:  (axis, value, title, [(line_axis, at), ...], label windows?)
PLAN_PAGE1 = [
    ("Z", 54.5, "SECTION A-A  at Z = 54.5  (just below top surface)", [("h", 55.42), ("h", 20.56), ("v", 35.04)], True),
    ("Z", 49.5, "SECTION B-B  at Z = 49.5  (pocket level under the top windows)", [("h", 55.42), ("h", 20.56), ("v", 35.04)], True),
    ("Z", 22.0, "SECTION C-C  at Z = 22.0  (mid-height of the body)", [("h", 36.7), ("v", 38.9)], True),
]
PLAN_PAGE2 = [
    ("X", 35.04, "SECTION D-D  at X = 35.04  (centre line, looking along -X)", [("h", 25.0), ("h", 51.5), ("v", 33.0)], False),
    ("Y", 26.78, "SECTION E-E  at Y = 26.78  (through the 5 mm pivot bore, looking along +Y)", [("h", 27.0), ("h", 51.5), ("v", 50.0), ("v", 10.0)], False),
    ("Y", 55.42, "SECTION F-F  at Y = 55.42  (through the large top window, looking along +Y)", [("h", 25.0), ("h", 51.5), ("v", 50.0)], False),
]

log = []


def run_plan(fig, plan, slots):
    for (axis, v, title, lines, wl), slot in zip(plan, slots):
        ax = fig.add_axes(slot)
        faces = draw_section(ax, axis, v, title)
        log.append("== " + title)
        if wl:
            for w, h, lo, hi in window_labels(ax, faces, axis):
                log.append("   opening %.2f x %.2f" % (w, h))
        for la, at in lines:
            pcs = chain(ax, faces, axis, la, at)
            if pcs:
                log.append("   scan %s @ %.2f: " % (la, at) + "  ".join(
                    ("[%.2f]" if k == "gap" else "%.2f") % (b - a) for a, b, k in pcs))
        frame(ax, axis)


def key_panel(fig, slot):
    ax = fig.add_axes(slot)
    ax.set_title("SECTION KEY  (top view outline, cut lines)", fontsize=9, weight="bold")
    for si, f in section_faces("Z", 45.0) + section_faces("Z", 54.5):
        for w in f.Wires:
            p = poly(w, "Z")
            ax.plot(p[:, 0], p[:, 1], color=EDGE[si], lw=0.5)
    W, Lg = bb.XLength, bb.YLength
    for y, name in ((55.42, "F"), (26.78, "E")):
        ax.plot([-4, W + 4], [y, y], color="#c00", lw=0.8, ls=(0, (8, 2, 1, 2)))
        ax.text(-5, y, name, color="#c00", fontsize=9, weight="bold", ha="right", va="center")
        ax.text(W + 5, y, name, color="#c00", fontsize=9, weight="bold", ha="left", va="center")
    ax.plot([35.04, 35.04], [-4, Lg + 4], color="#c00", lw=0.8, ls=(0, (8, 2, 1, 2)))
    ax.text(35.04, -5.5, "D", color="#c00", fontsize=9, weight="bold", ha="center", va="top")
    ax.text(35.04, Lg + 5, "D", color="#c00", fontsize=9, weight="bold", ha="center", va="bottom")
    ax.text(W / 2, -17, "A-A, B-B, C-C are horizontal cuts at the heights shown in their titles.\n"
            "Hatched = material.  Green bold = open space / gap.  Grey = wall thickness.",
            ha="center", fontsize=7)
    ax.set_aspect("equal"); ax.axis("off")
    frame(ax, "Z", pad=12)
    ax.set_xlim(-12, W + 12); ax.set_ylim(-22, Lg + 10)


slots = [[0.01, 0.50, 0.48, 0.44], [0.51, 0.50, 0.48, 0.44], [0.01, 0.02, 0.48, 0.44], [0.51, 0.02, 0.48, 0.44]]
with PdfPages(OUT + ".pdf") as pdf:
    fig = plt.figure(figsize=(16.54, 11.69))
    fig.suptitle("GYM-BEAM Top Arm V2.1  -  INSIDE dimensions, sheet 1 of 2  (mm, datum 0,0,0 = minimum corner)",
                 fontsize=12, weight="bold")
    key_panel(fig, slots[0])
    run_plan(fig, PLAN_PAGE1, slots[1:])
    fig.savefig(OUT + "-sheet-1.png", dpi=200); pdf.savefig(fig)

    fig = plt.figure(figsize=(16.54, 11.69))
    fig.suptitle("GYM-BEAM Top Arm V2.1  -  INSIDE dimensions, sheet 2 of 2  (mm, datum 0,0,0 = minimum corner)",
                 fontsize=12, weight="bold")
    run_plan(fig, PLAN_PAGE2, slots[:3])
    axn = fig.add_axes(slots[3]); axn.axis("off")
    axn.text(0, 0.95, "HOW TO READ THESE SECTIONS\n\n"
             "\u2022 Each section is the part cut open by a flat plane (see the key on sheet 1).\n"
             "\u2022 Hatched areas are solid material: blue = Part A, orange = Part B.\n"
             "\u2022 The dash-dot lines are measuring lines. Along each one:\n"
             "     green bold numbers = open space (inside gap, pocket, window, cavity)\n"
             "     grey numbers = wall / material thickness\n"
             "\u2022 'opening W \u00d7 L' boxes give the full size of a closed window in that cut.\n"
             "\u2022 Part A and Part B are separate solids with a ~0.5 mm clearance between them,\n"
             "   which shows as a small green gap where they meet.\n"
             "\u2022 Exact values from the STEP model; text file with all numbers saved alongside.",
             fontsize=8.5, va="top", family="monospace")
    fig.savefig(OUT + "-sheet-2.png", dpi=200); pdf.savefig(fig)

with open(OUT + ".txt", "w", encoding="utf-8") as fh:
    fh.write("Gaps in [brackets] = open space; plain numbers = material thickness (mm)\n")
    fh.write("\n".join(log) + "\n")
print("done")

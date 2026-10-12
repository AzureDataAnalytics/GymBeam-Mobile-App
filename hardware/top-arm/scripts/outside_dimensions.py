import math
import numpy as np
import Part
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

STEP = "hardware/top-arm/cad/gymbeam-top-arm-v2.1.step"
OUT_PDF = "hardware/top-arm/drawings/gymbeam-top-arm-v2.1-outside-dimensions.pdf"
OUT_PNG = "hardware/top-arm/drawings/gymbeam-top-arm-v2.1-outside-dimensions.png"
RES = 0.05
PART_COLORS = [np.array([0.62, 0.74, 0.90]), np.array([0.97, 0.75, 0.50])]
PART_LINE = ["#1f5fae", "#c25e00"]
PART_NAMES = ["Part A", "Part B"]

shape = Part.Shape()
shape.read(STEP)
solids = shape.Solids
bb = shape.BoundBox
DATUM = np.array([bb.XMin, bb.YMin, bb.ZMin])


def basis(back, up):
    b = np.array(back, float); b /= np.linalg.norm(b)
    r = np.cross(up, b); r /= np.linalg.norm(r)
    u = np.cross(b, r)
    return np.vstack([r, u, b])


VIEWS = {
    "TOP VIEW (looking down -Z)": (basis((0, 0, 1), (0, 1, 0)), ("X", "Y")),
    "FRONT VIEW (looking along +Y)": (basis((0, -1, 0), (0, 0, 1)), ("X", "Z")),
    "RIGHT VIEW (looking along -X)": (basis((1, 0, 0), (0, 0, 1)), ("Y", "Z")),
    "ISOMETRIC (reference only)": (basis((1, -1, 0.9), (0, 0, 1)), None),
}

# ---------- tessellation ----------
mesh = []
for si, so in enumerate(solids):
    pts, tris = so.tessellate(0.03)
    P = np.array([[p.x, p.y, p.z] for p in pts]) - DATUM
    T = np.array(tris, int)
    mesh.append((si, P, T))

# ---------- B-rep edges (sampled) ----------
edge_pts = []
for si, so in enumerate(solids):
    for e in so.Edges:
        try:
            pts = e.discretize(Distance=0.08)
        except Exception:
            continue
        if len(pts) >= 2:
            edge_pts.append((si, np.array([[p.x, p.y, p.z] for p in pts]) - DATUM))

# ---------- cylindrical features ----------
face_owner = {}
for si, so in enumerate(solids):
    for f in so.Faces:
        face_owner[f.hashCode()] = si

raw = []
for f in shape.Faces:
    if f.Surface.__class__.__name__ != "Cylinder":
        continue
    c = f.Surface
    a = np.array([c.Axis.x, c.Axis.y, c.Axis.z]); a /= np.linalg.norm(a)
    k = int(np.argmax(np.abs(a)))
    if a[k] < 0:
        a = -a
    p0 = np.array([c.Center.x, c.Center.y, c.Center.z]) - DATUM
    ts = [np.dot(np.array([v.X, v.Y, v.Z]) - DATUM - p0, a) for v in f.Vertexes]
    if not ts:
        ts = [0.0]
    u0, u1, v0, v1 = f.ParameterRange
    sp = f.valueAt((u0 + u1) / 2, (v0 + v1) / 2)
    raw.append(dict(d=2 * c.Radius, a=a, p0=p0, t0=min(ts), t1=max(ts), span=u1 - u0,
                    pt=np.array([sp.x, sp.y, sp.z]) - DATUM,
                    hole=(f.Orientation == "Reversed"), part=face_owner.get(f.hashCode(), -1)))

feats = []
for r in raw:
    foot = r["p0"] - np.dot(r["p0"], r["a"]) * r["a"]
    match = None
    for g in feats:
        if (abs(g["d"] - r["d"]) < 0.02 and np.dot(g["a"], r["a"]) > 0.999
                and np.linalg.norm(g["foot"] - foot) < 0.05 and g["hole"] == r["hole"]):
            match = g
            break
    t0 = np.dot(r["p0"], r["a"]) + r["t0"]
    t1 = np.dot(r["p0"], r["a"]) + r["t1"]
    if match:
        match["t0"] = min(match["t0"], t0); match["t1"] = max(match["t1"], t1)
        match["span"] += r["span"]
    else:
        feats.append(dict(d=r["d"], a=r["a"], foot=foot, t0=t0, t1=t1, span=r["span"], pt=r["pt"],
                          hole=r["hole"], part=r["part"]))

tiny = [g for g in feats if g["d"] < 0.5]
feats = [g for g in feats if g["d"] >= 0.5]
feats.sort(key=lambda g: (g["d"], g["foot"][0], g["foot"][1]))
for i, g in enumerate(feats, 1):
    g["id"] = i
    g["full"] = g["span"] >= 2 * math.pi - 0.05
    g["mid"] = g["foot"] + g["a"] * (g["t0"] + g["t1"]) / 2
    g["len"] = g["t1"] - g["t0"]


def axis_name(a):
    names = ["X", "Y", "Z"]
    k = int(np.argmax(np.abs(a)))
    if abs(a[k]) > 0.995:
        return names[k]
    return "angled (%.2f, %.2f, %.2f)" % tuple(a)


def kind(g):
    if g["hole"]:
        return "Hole" if g["full"] else "Concave arc"
    return "Pin / boss" if g["full"] else "Outer round"


def size_label(g):
    return ("\u2300%.2f" % g["d"]) if g["full"] else ("R%.2f" % (g["d"] / 2))


# ---------- rendering ----------
def render(R):
    allP = [P @ R.T for _, P, _ in mesh]
    mins = np.min([p.min(0) for p in allP], 0); maxs = np.max([p.max(0) for p in allP], 0)
    x0, y0 = mins[0] - 1, mins[1] - 1
    W = int((maxs[0] - mins[0] + 2) / RES) + 1
    H = int((maxs[1] - mins[1] + 2) / RES) + 1
    zbuf = np.full((H, W), -np.inf)
    img = np.ones((H, W, 3))
    L = np.array([0.35, 0.45, 1.0]); L /= np.linalg.norm(L)
    for (si, _, T), V in zip(mesh, allP):
        base = PART_COLORS[si % 2]
        for tri in T:
            v = V[tri]
            n = np.cross(v[1] - v[0], v[2] - v[0])
            nn = np.linalg.norm(n)
            if nn < 1e-12:
                continue
            shade = 0.30 + 0.70 * abs(np.dot(n / nn, L))
            px = (v[:, 0] - x0) / RES; py = (v[:, 1] - y0) / RES
            i0, i1 = int(max(0, math.floor(px.min()))), int(min(W - 1, math.ceil(px.max())))
            j0, j1 = int(max(0, math.floor(py.min()))), int(min(H - 1, math.ceil(py.max())))
            if i1 < i0 or j1 < j0:
                continue
            xs, ys = np.meshgrid(np.arange(i0, i1 + 1) + 0.5, np.arange(j0, j1 + 1) + 0.5)
            d = (py[1] - py[2]) * (px[0] - px[2]) + (px[2] - px[1]) * (py[0] - py[2])
            if abs(d) < 1e-12:
                continue
            w0 = ((py[1] - py[2]) * (xs - px[2]) + (px[2] - px[1]) * (ys - py[2])) / d
            w1 = ((py[2] - py[0]) * (xs - px[2]) + (px[0] - px[2]) * (ys - py[2])) / d
            w2 = 1 - w0 - w1
            inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not inside.any():
                continue
            z = w0 * v[0, 2] + w1 * v[1, 2] + w2 * v[2, 2]
            sub = zbuf[j0:j1 + 1, i0:i1 + 1]
            upd = inside & (z > sub)
            sub[upd] = z[upd]
            img[j0:j1 + 1, i0:i1 + 1][upd] = base * shade
    return img, zbuf, (x0, y0, W, H), mins, maxs


def visible_edges(R, zbuf, frame):
    x0, y0, W, H = frame
    zpad = np.pad(zbuf, 1, constant_values=-np.inf)
    zmin = np.min(np.stack([zpad[1 + dj:H + 1 + dj, 1 + di:W + 1 + di]
                            for dj in (-1, 0, 1) for di in (-1, 0, 1)]), 0)
    segs = []
    for si, E in edge_pts:
        Q = E @ R.T
        ii = np.clip(((Q[:, 0] - x0) / RES).astype(int), 0, W - 1)
        jj = np.clip(((Q[:, 1] - y0) / RES).astype(int), 0, H - 1)
        vis = Q[:, 2] >= zmin[jj, ii] - 0.12
        start = None
        for k in range(len(Q) + 1):
            if k < len(Q) and vis[k]:
                if start is None:
                    start = k
            elif start is not None:
                if k - start >= 2:
                    segs.append(Q[start:k, :2])
                start = None
    return segs


def dim_line(ax, p1, p2, off, text, color="black", fs=6.5):
    p1 = np.array(p1, float); p2 = np.array(p2, float)
    d = p2 - p1; L = np.linalg.norm(d)
    n = np.array([-d[1], d[0]]) / L
    q1, q2 = p1 + n * off, p2 + n * off
    for p, q in ((p1, q1), (p2, q2)):
        ax.plot([p[0], q[0] + n[0] * 1.0], [p[1], q[1] + n[1] * 1.0], color=color, lw=0.4)
    ax.annotate("", q1, q2, arrowprops=dict(arrowstyle="<|-|>", color=color, lw=0.6,
                                             shrinkA=0, shrinkB=0, mutation_scale=6))
    m = (q1 + q2) / 2 + n * 1.2
    ang = math.degrees(math.atan2(d[1], d[0]))
    if ang > 90 or ang < -90:
        ang += 180
    ax.text(m[0], m[1], text, ha="center", va="center", rotation=ang, fontsize=fs, color=color,
            bbox=dict(fc="white", ec="none", pad=0.4))


def spread(vals, gap):
    order = np.argsort(vals)
    out = np.array(vals, float)
    for _ in range(200):
        moved = False
        s = out[order]
        for k in range(1, len(s)):
            if s[k] - s[k - 1] < gap:
                push = (gap - (s[k] - s[k - 1])) / 2
                s[k - 1] -= push; s[k] += push; moved = True
        out[order] = s
        if not moved:
            break
    return out


fig = plt.figure(figsize=(16.54, 11.69))
fig.suptitle("GYM-BEAM Top Arm V2.1  -  dimensions in mm  (datum 0,0,0 = minimum corner of the overall model)",
             fontsize=12, weight="bold")
positions = {"TOP VIEW (looking down -Z)": [0.02, 0.50, 0.47, 0.44],
             "FRONT VIEW (looking along +Y)": [0.02, 0.03, 0.47, 0.44],
             "RIGHT VIEW (looking along -X)": [0.51, 0.03, 0.47, 0.44],
             "ISOMETRIC (reference only)": [0.51, 0.50, 0.47, 0.44]}
summary_lines = []

for title, (R, axes) in VIEWS.items():
    ax = fig.add_axes(positions[title])
    img, zbuf, frame, mins, maxs = render(R)
    x0, y0, W, H = frame
    ax.imshow(img, origin="lower", extent=[x0, x0 + W * RES, y0, y0 + H * RES], interpolation="bilinear")
    for seg in visible_edges(R, zbuf, frame):
        ax.plot(seg[:, 0], seg[:, 1], color="#222", lw=0.35)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title(title, fontsize=9, weight="bold")
    if axes is None:
        for si, c in enumerate(PART_LINE[:len(solids)]):
            ax.text(0.02, 0.06 - si * 0.04, "\u25A0 " + PART_NAMES[si], color=c, transform=ax.transAxes, fontsize=8)
        ax.set_xlim(mins[0] - 6, maxs[0] + 6); ax.set_ylim(mins[1] - 6, maxs[1] + 6)
        continue

    xmin, ymin, xmax, ymax = mins[0], mins[1], maxs[0], maxs[1]
    dim_line(ax, (xmax, ymin), (xmin, ymin), 5, "%.2f" % (xmax - xmin))
    dim_line(ax, (xmin, ymin), (xmin, ymax), 5, "%.2f" % (ymax - ymin))
    summary_lines.append("%s: overall %s %.2f x %s %.2f" % (title.split(" (")[0], axes[0], xmax - xmin, axes[1], ymax - ymin))
    for si, so in enumerate(solids):
        V = np.array([[v.X, v.Y, v.Z] for v in so.Vertexes]) - DATUM
        Pm = [P for s2, P, _ in mesh if s2 == si][0] @ R.T
        a0, a1 = Pm.min(0), Pm.max(0)
        dim_line(ax, (a0[0], ymax), (a1[0], ymax), 4 + 5 * si, "%s %.2f" % (PART_NAMES[si], a1[0] - a0[0]),
                 color=PART_LINE[si])
        dim_line(ax, (xmax, a1[1]), (xmax, a0[1]), 4 + 5 * si, "%s %.2f" % (PART_NAMES[si], a1[1] - a0[1]),
                 color=PART_LINE[si])

    view_dir = R[2]
    shown = []
    for g in feats:
        if abs(np.dot(g["a"], view_dir)) < 0.995 or g["d"] < 1.0:
            continue
        c = g["mid"] @ R.T
        key = (round(c[0], 1), round(c[1], 1), round(g["d"], 2))
        if any(k == key for k, _ in shown):
            continue
        if g["full"]:
            shown.append((key, g))
            ax.add_patch(plt.Circle((c[0], c[1]), g["d"] / 2, fill=False, ls=(0, (2, 1.5)),
                                    lw=0.5, color="#d0021b"))
        else:
            p = g["pt"] @ R.T
            shown.append(((round(p[0], 1), round(p[1], 1), round(g["d"], 2)), g))
            ax.plot(p[0], p[1], "o", ms=1.6, color="#d0021b")
    cx = (xmin + xmax) / 2
    left = [(k, g) for k, g in shown if k[0] < cx]
    right = [(k, g) for k, g in shown if k[0] >= cx]
    for side, items in (("L", left), ("R", right)):
        if not items:
            continue
        ys = spread([k[1] for k, _ in items], 2.6)
        lx = xmin - 13 if side == "L" else xmax + 15
        for (k, g), ly in zip(items, ys):
            ang = math.atan2(ly - k[1], lx - k[0])
            rr = g["d"] / 2 if g["full"] else 0
            ex, ey = k[0] + math.cos(ang) * rr, k[1] + math.sin(ang) * rr
            ax.plot([ex, lx], [ey, ly], color="#d0021b", lw=0.35)
            ax.text(lx + (-0.5 if side == "L" else 0.5), ly, "H%d %s" % (g["id"], size_label(g)),
                    ha="right" if side == "L" else "left", va="center", fontsize=6, color="#d0021b")
    ax.set_xlim(xmin - 26, xmax + 30); ax.set_ylim(ymin - 10, ymax + 14)
    ax.annotate("", (xmin - 22, ymin - 8), (xmin - 16, ymin - 8),
                arrowprops=dict(arrowstyle="<|-", lw=0.6, mutation_scale=6))
    ax.annotate("", (xmin - 22, ymin - 8), (xmin - 22, ymin - 2),
                arrowprops=dict(arrowstyle="<|-", lw=0.6, mutation_scale=6))
    ax.text(xmin - 15, ymin - 8, "+" + axes[0], fontsize=6, va="center")
    ax.text(xmin - 22, ymin - 1.2, "+" + axes[1], fontsize=6, ha="center")

fig.savefig(OUT_PNG, dpi=200)

with PdfPages(OUT_PDF) as pdf:
    pdf.savefig(fig)
    fig2 = plt.figure(figsize=(16.54, 11.69))
    fig2.suptitle("GYM-BEAM Top Arm V2.1  -  round features table (mm, positions from datum = model minimum corner)",
                  fontsize=12, weight="bold")
    ax = fig2.add_axes([0.03, 0.12, 0.94, 0.82]); ax.axis("off")
    rows = []
    for g in feats:
        m = g["mid"]
        rows.append(["H%d" % g["id"], kind(g), size_label(g), "%.2f" % g["d"],
                     "%.2f" % g["len"], axis_name(g["a"]),
                     "%.2f" % m[0], "%.2f" % m[1], "%.2f" % m[2],
                     PART_NAMES[g["part"]] if g["part"] >= 0 else "-"])
    tbl = ax.table(cellText=rows, colLabels=["ID", "Type", "Size", "Dia", "Length / depth", "Axis",
                                             "Centre X", "Centre Y", "Centre Z", "Part"],
                   loc="upper center", cellLoc="center")
    tbl.auto_set_font_size(False); tbl.set_fontsize(7); tbl.scale(1, 1.15)
    notes = ["Overall model: X %.2f x Y %.2f x Z %.2f mm, volume %.1f cm\u00b3" % (bb.XLength, bb.YLength, bb.ZLength, shape.Volume / 1000)]
    for si, so in enumerate(solids):
        b = so.BoundBox
        notes.append("%s: X %.2f x Y %.2f x Z %.2f mm, volume %.1f cm\u00b3" % (PART_NAMES[si], b.XLength, b.YLength, b.ZLength, so.Volume / 1000))
    if tiny:
        notes.append("Also %d very small round features of \u2300%.2f (decorative / detail pattern) - not listed." % (len(tiny), tiny[0]["d"]))
    notes.append("Centre = midpoint of the feature along its axis. Length = extent of the round surface along its axis. "
                 "R = partial arc (radius), \u2300 = full circle (diameter).")
    fig2.text(0.03, 0.02, "\n".join(notes), fontsize=8, va="bottom")
    pdf.savefig(fig2)

with open(OUT_PDF.replace(".pdf", ".txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(summary_lines + notes) + "\n\n")
    fh.write("ID | Type | Size | Dia | Length | Axis | X | Y | Z | Part\n")
    for r in rows:
        fh.write(" | ".join(r) + "\n")
print("done")

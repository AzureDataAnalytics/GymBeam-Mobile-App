import Part, Mesh
from collections import Counter

step = "hardware/top-arm/cad/gymbeam-top-arm-v2.1.step"
stl = "hardware/top-arm/cad/gymbeam-top-arm-v2.1.stl"

s = Part.Shape()
s.read(step)
bb = s.BoundBox
print("STEP solids:", len(s.Solids), "faces:", len(s.Faces), "valid:", s.isValid())
print("BBox mm: X %.2f..%.2f (%.2f)  Y %.2f..%.2f (%.2f)  Z %.2f..%.2f (%.2f)" % (
    bb.XMin, bb.XMax, bb.XLength, bb.YMin, bb.YMax, bb.YLength, bb.ZMin, bb.ZMax, bb.ZLength))
print("Volume mm3: %.1f  Area mm2: %.1f" % (s.Volume, s.Area))
for i, so in enumerate(s.Solids):
    b = so.BoundBox
    print("  solid %d vol %.1f bbox %.1f x %.1f x %.1f" % (i, so.Volume, b.XLength, b.YLength, b.ZLength))

print("Face types:", dict(Counter(f.Surface.__class__.__name__ for f in s.Faces)))

holes = []
for f in s.Faces:
    if f.Surface.__class__.__name__ == "Cylinder":
        c = f.Surface
        ax = c.Axis
        holes.append((round(c.Radius * 2, 2), tuple(round(v, 1) for v in c.Center), tuple(round(v, 2) for v in ax),
                      round(f.BoundBox.DiagonalLength, 1), f.Orientation))
print("Cylindrical faces (dia, center, axis, size, orientation):")
for h in sorted(set(holes)):
    print("  ", h)

m = Mesh.Mesh(stl)
mb = m.BoundBox
print("STL facets:", m.CountFacets, "solid:", m.isSolid(), "volume %.1f" % m.Volume)
print("STL bbox: %.2f x %.2f x %.2f" % (mb.XLength, mb.YLength, mb.ZLength))

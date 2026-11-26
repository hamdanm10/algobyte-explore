// Usage: node scripts/build-world.mjs <ne_50m_admin_0_countries.geojson>
// Sumber: Natural Earth 1:50m Admin 0 Countries (public domain). Menyederhanakan dan menulis src/shared/data/world-countries.json
// Properti: name (NAME), iso (ADM0_A3), c (MAPCOLOR7, 1-7, untuk warna pastel atlas tanpa tetangga sewarna)
import fs from "node:fs";
import simplify from "@turf/simplify";
import { geoArea } from "d3-geo";

// d3-geo memakai arah putaran berlawanan dengan RFC 7946: poligon yang luasnya > setengah bola dibalik,
// kalau tidak, negara terisi sebagai "seluruh bola kecuali negara itu".
const fixPolygon = (rings) => {
  const poly = { type: "Polygon", coordinates: rings };
  return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
};
const rewind = (g) =>
  g.type === "Polygon" ? { ...g, coordinates: fixPolygon(g.coordinates) } : { ...g, coordinates: g.coordinates.map(fixPolygon) };

const geo = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const round = (x) => (Array.isArray(x) ? x.map(round) : Math.round(x * 100) / 100);
const out = {
  type: "FeatureCollection",
  features: geo.features
    .filter((f) => f.properties.ADM0_A3 !== "ATA")
    .map((f) => {
      const s = simplify(f, { tolerance: 0.04, highQuality: false, mutate: false });
      return {
        type: "Feature",
        properties: { name: f.properties.NAME, iso: f.properties.ADM0_A3, c: f.properties.MAPCOLOR7 },
        geometry: rewind({ type: s.geometry.type, coordinates: round(s.geometry.coordinates) }),
      };
    }),
};
fs.writeFileSync("src/shared/data/world-countries.json", JSON.stringify(out));
console.log("negara:", out.features.length, "bytes:", fs.statSync("src/shared/data/world-countries.json").size);

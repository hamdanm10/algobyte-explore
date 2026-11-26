// Usage: node scripts/build-geo.mjs <ne_10m_admin_1_states_provinces.geojson>
// Source: Natural Earth (public domain). Filters Indonesia, simplifies, writes src/shared/data/idn-provinces.json
import fs from "node:fs";
import simplify from "@turf/simplify";

const src = process.argv[2];
const geo = JSON.parse(fs.readFileSync(src, "utf8"));
const idn = geo.features.filter((f) => f.properties.adm0_a3 === "IDN");
console.log("provinces:", idn.length);
const out = {
  type: "FeatureCollection",
  features: idn.map((f) => {
    const s = simplify(f, { tolerance: 0.01, highQuality: false, mutate: false });
    return {
      type: "Feature",
      properties: { name: f.properties.name, iso: f.properties.iso_3166_2 },
      geometry: s.geometry,
    };
  }),
};
fs.writeFileSync("src/shared/data/idn-provinces.json", JSON.stringify(out));
console.log(idn.map((f) => `${f.properties.iso_3166_2}:${f.properties.name}`).join(" | "));
console.log("bytes:", fs.statSync("src/shared/data/idn-provinces.json").size);

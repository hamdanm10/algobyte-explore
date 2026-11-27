import { geoContains } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import raw from "../data/idn-provinces.json";
import { PROVINCES, projectLonLat } from "./map";

// Kelompok pulau BPS untuk 33 poligon lama + peta titik penduduk (dipakai L001). Gunung api: ../data/idn-volcanoes.json
// (Smithsonian GVP Holocene volcanoes, Indonesia, unduh 2026-11-27; field java = di Pulau Jawa).

// Kelompok pulau sesuai cara BPS menjumlahkan provinsi (33 poligon lama Natural Earth).
export type Island = "jawa" | "sumatera" | "kalimantan" | "sulawesi" | "balinusra" | "malukupapua";
export const ISLAND_OF: Record<string, Island> = {
  Banten: "jawa", "Jakarta Raya": "jawa", "Jawa Barat": "jawa", "Jawa Tengah": "jawa", Yogyakarta: "jawa", "Jawa Timur": "jawa",
  Aceh: "sumatera", "Sumatera Utara": "sumatera", "Sumatera Barat": "sumatera", Riau: "sumatera", "Kepulauan Riau": "sumatera",
  Jambi: "sumatera", "Sumatera Selatan": "sumatera", Bengkulu: "sumatera", Lampung: "sumatera", "Bangka-Belitung": "sumatera",
  "Kalimantan Barat": "kalimantan", "Kalimantan Tengah": "kalimantan", "Kalimantan Selatan": "kalimantan", "Kalimantan Timur": "kalimantan",
  "Sulawesi Utara": "sulawesi", Gorontalo: "sulawesi", "Sulawesi Tengah": "sulawesi", "Sulawesi Barat": "sulawesi",
  "Sulawesi Selatan": "sulawesi", "Sulawesi Tenggara": "sulawesi",
  Bali: "balinusra", "Nusa Tenggara Barat": "balinusra", "Nusa Tenggara Timur": "balinusra",
  Maluku: "malukupapua", "Maluku Utara": "malukupapua", Papua: "malukupapua", "Papua Barat": "malukupapua",
};

export const ISLAND_LABEL: Record<Island, string> = {
  jawa: "Jawa", sumatera: "Sumatera", kalimantan: "Kalimantan", sulawesi: "Sulawesi", balinusra: "Bali-Nusa Tenggara", malukupapua: "Maluku-Papua",
};

// SP2020 (BPS): persen penduduk per pulau. 1 titik = 100 ribu orang (270,2 juta -> sekitar 2.700 titik).
export const POP_PCT: Record<Island, number> = { jawa: 56.1, sumatera: 21.68, sulawesi: 7.36, kalimantan: 6.15, balinusra: 5.54, malukupapua: 3.17 };
export const DOTS: Record<Island, number> = Object.fromEntries(
  Object.entries(POP_PCT).map(([k, v]) => [k, Math.round((v / 100) * 2702)]),
) as Record<Island, number>;

const fc = raw as unknown as FeatureCollection<Geometry, { name: string }>;

// Titik acak deterministik di dalam poligon kelompok pulau (seragam per luas, jadi kerapatan = kepadatan).
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const bboxOf = (fs: Feature<Geometry>[]) => {
  let x0 = 999, y0 = 999, x1 = -999, y1 = -999;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    } else (c as unknown[]).forEach(walk);
  };
  fs.forEach((f) => walk((f.geometry as { coordinates: unknown }).coordinates));
  return { x0, y0, x1, y1 };
};

export type Dot = { x: number; y: number; island: Island; r: number };
export const POP_DOTS: Dot[] = (() => {
  const out: Dot[] = [];
  (Object.keys(DOTS) as Island[]).forEach((isl, k) => {
    const feats = fc.features.filter((f) => ISLAND_OF[f.properties.name] === isl);
    const b = bboxOf(feats);
    const rand = rng(1234 + k * 97);
    let n = 0;
    let guard = 0;
    while (n < DOTS[isl] && guard++ < 400000) {
      const lon = b.x0 + rand() * (b.x1 - b.x0);
      const lat = b.y0 + rand() * (b.y1 - b.y0);
      if (feats.some((f) => geoContains(f, [lon, lat]))) {
        const [x, y] = projectLonLat(lon, lat);
        out.push({ x, y, island: isl, r: rand() });
        n++;
      }
    }
  });
  return out;
})();

// Kotak (koordinat peta) satu kelompok pulau, untuk kamera
export const islandBox = (isl: Island) => {
  const ps = PROVINCES.filter((p) => ISLAND_OF[p.name] === isl);
  const x0 = Math.min(...ps.map((p) => p.box[0])), y0 = Math.min(...ps.map((p) => p.box[1]));
  const x1 = Math.max(...ps.map((p) => p.box[0] + p.box[2])), y1 = Math.max(...ps.map((p) => p.box[1] + p.box[3]));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
};


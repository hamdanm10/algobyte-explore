import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import raw from "../data/idn-provinces.json";

// Data batas provinsi: Natural Earth (public domain), disederhanakan lewat scripts/build-geo.mjs
export const MAP_W = 2400;

const fc = raw as unknown as FeatureCollection<Geometry, { name: string; iso: string }>;

const unit = geoMercator().scale(1).translate([0, 0]);
const [[x0, y0], [x1, y1]] = geoPath(unit).bounds(fc);
const k = MAP_W / (x1 - x0);

const projection = geoMercator()
  .scale(k)
  .translate([-x0 * k, -y0 * k]);

export const MAP_H = Math.ceil((y1 - y0) * k);

const toPath = geoPath(projection);

export type Province = {
  readonly name: string;
  readonly d: string;
  readonly cx: number;
  readonly cy: number;
  // Kotak pembatas di koordinat peta, ditambah margin untuk garis tepi: [x, y, lebar, tinggi]
  readonly box: readonly [number, number, number, number];
};

const PAD = 6;

export const PROVINCES: readonly Province[] = fc.features.map((f) => {
  const [cx, cy] = toPath.centroid(f);
  const [[bx0, by0], [bx1, by1]] = toPath.bounds(f);
  const box = [bx0 - PAD, by0 - PAD, bx1 - bx0 + PAD * 2, by1 - by0 + PAD * 2] as const;
  return { name: f.properties.name, d: toPath(f) ?? "", cx, cy, box };
});

export const findProvince = (name: string): Province => {
  const p = PROVINCES.find((province) => province.name === name);
  if (!p) {
    throw new Error(`Provinsi "${name}" tidak ada di data peta`);
  }
  return p;
};

// Bujur/lintang (derajat) -> koordinat peta (px, sama dengan PROVINCES). Contoh: projectLonLat(107.6191, -6.9175) = Bandung.
export const projectLonLat = (lon: number, lat: number): [number, number] => {
  const p = projection([lon, lat]);
  return [p?.[0] ?? 0, p?.[1] ?? 0];
};

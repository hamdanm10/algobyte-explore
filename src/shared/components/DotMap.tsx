import React, { useMemo } from "react";
import { PROVINCES, MAP_W, MAP_H } from "../lib/map";

// Kepadatan (jiwa/km2) tiap poligon peta (33 provinsi lama). BPS 2024. Provinsi baru digabung ke poligon lamanya:
// Papua = Papua+Selatan+Tengah+Pegunungan (sekitar 15), Papua Barat = + Barat Daya (sekitar 12),
// Kalimantan Timur = + Kalimantan Utara (sekitar 25). Angka gabungan dihitung dari penduduk/luas, hanya untuk tebal-tipis titik.
export const DENSITY: Record<string, number> = {
  Aceh: 98, "Sumatera Utara": 215, "Sumatera Barat": 139, Riau: 75, Jambi: 76, "Sumatera Selatan": 102, Bengkulu: 105,
  Lampung: 281, "Kepulauan Riau": 264, "Bangka-Belitung": 92, "Jakarta Raya": 16165, "Jawa Barat": 1359,
  "Jawa Tengah": 1104, Yogyakarta: 1186, "Jawa Timur": 870, Banten: 1329, Bali: 793, "Nusa Tenggara Barat": 287,
  "Nusa Tenggara Timur": 122, "Kalimantan Barat": 39, "Kalimantan Tengah": 18, "Kalimantan Selatan": 115,
  "Kalimantan Timur": 25, "Sulawesi Utara": 186, "Sulawesi Tengah": 51, "Sulawesi Selatan": 209, "Sulawesi Tenggara": 77,
  Gorontalo: 102, "Sulawesi Barat": 91, Maluku: 42, "Maluku Utara": 41, "Papua Barat": 12, Papua: 15,
};

// Titik per piksel peta = kepadatan / DOT_DIV. Jakarta rapat sekali, Papua jarang.
const DOT_DIV = 20000;

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Dot = { x: number; y: number };

// Grid dengan jitter di dalam kotak provinsi; clipPath memotong yang di luar poligon. Urutan diacak agar muncul acak.
const buildDots = (box: readonly [number, number, number, number], density: number, seed: number): Dot[] => {
  const g = Math.max(1.2, 1 / Math.sqrt(density / DOT_DIV));
  const rand = rng(seed);
  const out: Dot[] = [];
  const [bx, by, bw, bh] = box;
  for (let y = by; y < by + bh && out.length < 4000; y += g) {
    for (let x = bx; x < bx + bw; x += g) {
      out.push({ x: x + (rand() - 0.5) * g * 0.8 + g / 2, y: y + (rand() - 0.5) * g * 0.8 + g / 2 });
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export type Cam = { readonly x: number; readonly y: number; readonly s: number };

type Props = {
  readonly width: number;
  readonly height: number;
  readonly cam: Cam;
  // Warna isi per nama poligon (default pasir)
  readonly fills?: Record<string, string>;
  // Kemajuan munculnya titik 0..1 per nama poligon (default 1)
  readonly dotProgress?: (name: string) => number;
  readonly dotColor?: string;
  readonly dotRadius?: number;
  readonly sea?: string;
  readonly baseFill?: string;
  readonly stroke?: string;
  // Outline tebal untuk sorotan: nama -> warna
  readonly outlines?: Record<string, string>;
  readonly children?: React.ReactNode;
};

export const DotMap: React.FC<Props> = ({
  width,
  height,
  cam,
  fills = {},
  dotProgress,
  dotColor = "rgba(43,42,51,0.8)",
  dotRadius = 3.2,
  sea = "#CFE0E2",
  baseFill = "#EADFC8",
  stroke = "#8A7F68",
  outlines = {},
  children,
}) => {
  const all = useMemo(
    () => PROVINCES.map((p, i) => ({ p, dots: buildDots(p.box, DENSITY[p.name] ?? 50, 1000 + i * 17) })),
    [],
  );
  const { x, y, s } = cam;
  const tx = width / 2 - x * s;
  const ty = height / 2 - y * s;
  // Persegi pandang yang terlihat (koordinat peta) untuk membuang yang di luar layar
  const vx0 = -tx / s;
  const vy0 = -ty / s;
  const vx1 = vx0 + width / s;
  const vy1 = vy0 + height / s;
  const visible = (b: readonly [number, number, number, number]) =>
    b[0] < vx1 && b[0] + b[2] > vx0 && b[1] < vy1 && b[1] + b[3] > vy0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", background: sea }}>
      <defs>
        {all.map(({ p }, i) => (
          <clipPath id={`clip-${i}`} key={p.name}>
            <path d={p.d} />
          </clipPath>
        ))}
      </defs>
      <g transform={`translate(${tx} ${ty}) scale(${s})`}>
        <rect x={-200} y={-200} width={MAP_W + 400} height={MAP_H + 400} fill={sea} />
        {all.map(({ p }) => (
          <path
            key={p.name}
            d={p.d}
            fill={fills[p.name] ?? baseFill}
            stroke={stroke}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        ))}
        {all.map(({ p, dots }, i) => {
          if (!visible(p.box)) {
            return null;
          }
          const prog = dotProgress ? dotProgress(p.name) : 1;
          const n = Math.floor(dots.length * prog);
          if (n <= 0) {
            return null;
          }
          return (
            <g key={p.name} clipPath={`url(#clip-${i})`} fill={dotColor}>
              {dots.slice(0, n).map((d, k) => (
                <circle key={k} cx={d.x} cy={d.y} r={dotRadius / s} />
              ))}
            </g>
          );
        })}
        {Object.entries(outlines).map(([name, color]) => {
          const p = PROVINCES.find((q) => q.name === name);
          return p ? (
            <path
              key={name}
              d={p.d}
              fill="none"
              stroke={color}
              strokeWidth={5}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ) : null;
        })}
        {children}
      </g>
    </svg>
  );
};

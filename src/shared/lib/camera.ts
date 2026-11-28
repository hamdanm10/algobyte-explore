// Kamera peta 2D: daftar "stop" {f, x, y, s} di koordinat peta (mis. MAP_W 2400 dari map.ts).
// x,y diinterpolasi linear, s di ruang logaritma (zoom terasa rata), ease inOut cubic antar stop.
// Pakai: const cam = cameraAt(frame, STOPS); <g transform={camTransform(cam, layarX, layarY)}>...</g>
// Hold = dua stop berurutan dengan posisi sama. Stop harus urut menurut f.
import { Easing } from "remotion";

export type Cam = { x: number; y: number; s: number };
export type CamStop = Cam & { f: number };

const ease = Easing.inOut(Easing.cubic);

export const cameraAt = (frame: number, stops: readonly CamStop[]): Cam => {
  if (frame <= stops[0].f) return stops[0];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (frame < b.f) {
      const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t),
      };
    }
  }
  return stops[stops.length - 1];
};

// Titik peta (cam.x, cam.y) jatuh di titik layar (sx, sy).
export const camTransform = (cam: Cam, sx: number, sy: number): string =>
  `translate(${sx - cam.x * cam.s}, ${sy - cam.y * cam.s}) scale(${cam.s})`;

// Kamera yang memuat kotak [x, y, w, h] di layar W x H, pad = porsi layar yang dipakai (0..1).
export const fitBox = (box: readonly [number, number, number, number], W: number, H: number, pad = 0.8): Cam => ({
  x: box[0] + box[2] / 2,
  y: box[1] + box[3] / 2,
  s: Math.min(W / box[2], H / box[3]) * pad,
});

// Gabungan beberapa kotak.
export const unionBox = (
  boxes: readonly (readonly [number, number, number, number])[],
): [number, number, number, number] => {
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};

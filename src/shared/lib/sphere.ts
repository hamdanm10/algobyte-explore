// Matematika bola: titik lon/lat <-> vektor 3D, jarak/titik di lingkaran besar, dan rotasi KAKU di permukaan bola.
// Rotasi kaku mempertahankan ukuran dan bentuk (jarak tetap sama), jadi penggaris/siluet yang dipindah tetap jujur.
export type LonLat = [number, number];
type V = [number, number, number];

const R_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export const toV = ([lon, lat]: LonLat): V => [
  Math.cos(rad(lat)) * Math.cos(rad(lon)),
  Math.cos(rad(lat)) * Math.sin(rad(lon)),
  Math.sin(rad(lat)),
];
export const fromV = ([x, y, z]: V): LonLat => [deg(Math.atan2(y, x)), deg(Math.asin(Math.max(-1, Math.min(1, z / Math.hypot(x, y, z)))))];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): V => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

export const distKm = (a: LonLat, b: LonLat) => R_KM * Math.acos(Math.max(-1, Math.min(1, dot(toV(a), toV(b)))));

// Titik-titik di lingkaran besar dari a ke arah b sepanjang km (bisa melewati b)
export const arcFrom = (a: LonLat, b: LonLat, km: number, n = 80): LonLat[] => {
  const A = toV(a);
  const T = norm(cross(cross(A, toV(b)), A)); // arah tangen di a menuju b
  const out: LonLat[] = [];
  for (let i = 0; i <= n; i++) {
    const th = ((km / R_KM) * i) / n;
    out.push(fromV([A[0] * Math.cos(th) + T[0] * Math.sin(th), A[1] * Math.cos(th) + T[1] * Math.sin(th), A[2] * Math.cos(th) + T[2] * Math.sin(th)]));
  }
  return out;
};

// Interpolasi pusat kamera di bola (slerp), supaya tidak ada lompatan di garis 180 derajat
export const slerpLonLat = (a: LonLat, b: LonLat, t: number): LonLat => {
  const A = toV(a);
  const B = toV(b);
  const w = Math.acos(Math.max(-1, Math.min(1, dot(A, B))));
  if (w < 1e-6) return a;
  const s = Math.sin(w);
  const k1 = Math.sin((1 - t) * w) / s;
  const k2 = Math.sin(t * w) / s;
  return fromV([A[0] * k1 + B[0] * k2, A[1] * k1 + B[1] * k2, A[2] * k1 + B[2] * k2]);
};

// ---- Rotasi kaku sebagai kuaternion ----
type Q = [number, number, number, number]; // w, x, y, z
type M = [V, V, V]; // baris

const frame = (a: LonLat, b: LonLat): M => {
  const e1 = toV(a);
  const e2 = norm(cross(cross(e1, toV(b)), e1));
  return [e1, e2, cross(e1, e2)];
};
// R = F2^T * F1  (memetakan e1->e1', e2->e2', e3->e3')
const matFromFrames = (f1: M, f2: M): M => {
  const r: M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i][j] += f2[k][i] * f1[k][j];
  return r;
};
const quatFromMat = (m: M): Q => {
  const tr = m[0][0] + m[1][1] + m[2][2];
  let q: Q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s];
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s];
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s];
  }
  return q;
};
const slerpQ = (a: Q, b: Q, t: number): Q => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) {
    d = -d;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (d > 0.9995) {
    const q = a.map((x, i) => x + (bb[i] - x) * t) as Q;
    const l = Math.hypot(...q);
    return q.map((x) => x / l) as Q;
  }
  const w = Math.acos(d);
  const s = Math.sin(w);
  return a.map((x, i) => (Math.sin((1 - t) * w) / s) * x + (Math.sin(t * w) / s) * bb[i]) as Q;
};
const rotV = ([w, x, y, z]: Q, v: V): V => {
  const u: V = [x, y, z];
  const t = cross(u, v).map((c) => 2 * c) as V;
  const c2 = cross(u, t);
  return [v[0] + w * t[0] + c2[0], v[1] + w * t[1] + c2[1], v[2] + w * t[2] + c2[2]];
};

export type Mover = (p: LonLat, t: number) => LonLat;
// Pindahkan secara kaku: titik `from` ke `to`, dengan arah from->fromDir menjadi arah to->toDir. t 0..1 (slerp dari identitas).
export const rigidMover = (from: LonLat, fromDir: LonLat, to: LonLat, toDir: LonLat): Mover => {
  const q = quatFromMat(matFromFrames(frame(from, fromDir), frame(to, toDir)));
  const id: Q = [1, 0, 0, 0];
  return (p, t) => (t <= 0 ? p : fromV(rotV(slerpQ(id, q, Math.min(1, t)), toV(p))));
};

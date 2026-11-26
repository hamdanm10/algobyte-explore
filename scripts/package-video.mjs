// Usage: node scripts/package-video.mjs <folder-video-di-out> <nama-paket>
// Contoh: node scripts/package-video.mjs 001-top-provinsi-terpadat 001-top-5-provinsi-penduduk-terbanyak
//
// Menyalin dari out/<folder-video-di-out>/ ke <EXPORT_DIR>/<nama-paket>/ :
//   *.mp4 (satu-satunya) -> <nama-paket>.mp4 ; thumbnail.png ; metadata.md
// lalu memverifikasi SHA-256 tiap file. TIDAK menghapus apa pun. Penghapusan folder project dilakukan terpisah
// (setelah user bilang tidak ada revisi) dan hanya bila skrip ini mencetak "SEMUA CHECKSUM COCOK".
// EXPORT_DIR default: /mnt/d/Hamdan/Contents/algobyte-explore/videos  (= D:\Hamdan\Contents\algobyte-explore\videos)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [src, name] = process.argv.slice(2);
if (!src || !name) throw new Error("Pakai: node scripts/package-video.mjs <folder-video-di-out> <nama-paket>");
if (!/^\d{3}-[a-z0-9-]+$/.test(name)) throw new Error(`Nama paket harus berformat 001-nama-video (huruf kecil, angka, strip): "${name}"`);

const exportRoot = process.env.EXPORT_DIR ?? "/mnt/d/Hamdan/Contents/algobyte-explore/videos";
const from = path.join("out", src);
const to = path.join(exportRoot, name);
if (!fs.existsSync(exportRoot)) throw new Error(`Folder tujuan tidak ada: ${exportRoot}`);
if (!fs.existsSync(from)) throw new Error(`Folder sumber tidak ada: ${from}`);
if (fs.existsSync(to) && fs.readdirSync(to).length > 0) throw new Error(`Folder tujuan sudah berisi file, tidak ditimpa: ${to}`);

const mp4s = fs.readdirSync(from).filter((f) => f.endsWith(".mp4"));
if (mp4s.length !== 1) throw new Error(`Harus ada tepat 1 file .mp4 di ${from}, ditemukan ${mp4s.length}`);
const files = [
  [mp4s[0], `${name}.mp4`],
  ["thumbnail.png", "thumbnail.png"],
  ["metadata.md", "metadata.md"],
];
for (const [s] of files) {
  if (!fs.existsSync(path.join(from, s))) throw new Error(`File wajib tidak ada: ${path.join(from, s)}`);
}

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
fs.mkdirSync(to, { recursive: true });
let ok = true;
for (const [s, d] of files) {
  fs.copyFileSync(path.join(from, s), path.join(to, d));
  const a = sha(path.join(from, s));
  const b = sha(path.join(to, d));
  const size = (fs.statSync(path.join(to, d)).size / 1e6).toFixed(2);
  console.log(`${a === b ? "OK   " : "BEDA "} ${d} (${size} MB) sha256 ${b.slice(0, 12)}`);
  if (a !== b) ok = false;
}
console.log(ok ? `SEMUA CHECKSUM COCOK -> ${to}` : "ADA CHECKSUM YANG TIDAK COCOK: JANGAN HAPUS APA PUN");
process.exit(ok ? 0 : 1);

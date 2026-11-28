// Usage: node scripts/recent-styles.mjs [--format=short|long] [--n=10]
// Mencetak kulit visual N video terakhir (default: 10 Short; video panjang: 5) dari docs/production-log.jsonl, satu baris
// per video, untuk aturan "palet/font/elemen khas wajib beda dari N video terakhir" tanpa membaca seluruh log/VIDEOS.md.
import { readLog } from "./lib/ytdb.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const format = arg("format") ?? "short";
const n = Number(arg("n") ?? (format === "long" ? 5 : 10));
const rows = readLog().filter((l) => l.format === format).slice(-n);
console.log(`Kulit visual ${rows.length} video ${format === "long" ? "panjang" : "Short"} terakhir (no | tema | peta | palet | font | reveal | tata letak):`);
for (const l of rows) {
  const v = l.visual ?? {};
  console.log(`${l.no} | ${v.theme ?? "-"} | ${v.map ?? "-"} | ${v.palette ?? "-"} | ${(v.fonts ?? []).join(", ") || "-"} | ${v.reveal ?? "-"} | ${v.layout ?? "-"}`);
}

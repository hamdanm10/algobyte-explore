// Usage: node scripts/voice-qa.mjs <folder-video>
// Pemeriksaan otomatis voice SEBELUM visual dibuat + membuat file pratinjau untuk didengar user:
//   out/<nama-folder>/voice-preview.mp3  (semua segmen berurutan, jeda 0,4 dtk antar segmen)
// Per segmen: durasi, kata per detik, loudness (LUFS), true peak, hening panjang di tengah. Bendera (!) bila di luar batas wajar.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const dir = process.argv[2];
if (!dir) throw new Error("Pakai: node scripts/voice-qa.mjs <folder-video>");
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const slug = path.basename(dir);
const outDir = path.join("out", slug);
fs.mkdirSync(outDir, { recursive: true });

const limits = { wpsMin: 1.8, wpsMax: 3.6, lufsMin: -19, lufsMax: -13, peakMax: -1, silenceMax: 1.0 };
const rows = [];
for (const seg of cfg.segments) {
  const wav = path.join(dir, "voice", `${seg.id}.wav`);
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString());
  const words = seg.text.split(/\s+/).filter(Boolean).length;
  const ln = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const j = JSON.parse(ln.slice(ln.lastIndexOf("{"), ln.lastIndexOf("}") + 1));
  const sil = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "silencedetect=noise=-40dB:d=0.3", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const longest = Math.max(0, ...[...sil.matchAll(/silence_duration: ([\d.]+)/g)].map((m) => parseFloat(m[1])));
  const wps = words / dur;
  const lufs = parseFloat(j.input_i);
  const peak = parseFloat(j.input_tp);
  const flags = [];
  if (wps < limits.wpsMin) flags.push("tempo lambat");
  if (wps > limits.wpsMax) flags.push("tempo cepat");
  if (lufs < limits.lufsMin || lufs > limits.lufsMax) flags.push("loudness");
  if (peak > limits.peakMax) flags.push("peak tinggi");
  if (longest > limits.silenceMax) flags.push("hening panjang");
  rows.push({ id: seg.id, dur, wps, lufs, peak, longest, flags });
}

console.log("segmen   durasi  kata/dtk   LUFS    peak   hening-maks  catatan");
for (const r of rows) {
  console.log(
    `${r.id.padEnd(8)} ${r.dur.toFixed(2).padStart(5)}s  ${r.wps.toFixed(2).padStart(7)}  ${r.lufs.toFixed(1).padStart(6)}  ${r.peak.toFixed(1).padStart(6)}  ${r.longest.toFixed(2).padStart(9)}s  ${r.flags.length ? "(!) " + r.flags.join(", ") : "ok"}`,
  );
}
const wpsAvg = rows.reduce((a, r) => a + r.wps, 0) / rows.length;
const lufsSpread = Math.max(...rows.map((r) => r.lufs)) - Math.min(...rows.map((r) => r.lufs));
console.log(`\nrata-rata tempo ${wpsAvg.toFixed(2)} kata/dtk; selisih loudness antar segmen ${lufsSpread.toFixed(1)} LU${lufsSpread > 3 ? " (!) tidak konsisten antar segmen" : " (konsisten)"}`);
const totalSec = rows.reduce((a, r) => a + r.dur, 0);
console.log(
  cfg.format === "long"
    ? `total durasi voice: ${totalSec.toFixed(1)} dtk (${(totalSec / 60).toFixed(1)} menit; target video panjang ada di docs/RECIPE-LONG.md)`
    : `total durasi voice: ${totalSec.toFixed(1)} dtk (batas Shorts yang disarankan: di bawah 60 dtk)`,
);

// Pratinjau gabungan untuk didengar
const inputs = cfg.segments.flatMap((s) => ["-i", path.join(dir, "voice", `${s.id}.wav`)]);
const n = cfg.segments.length;
const filter =
  cfg.segments.map((_, i) => `[${i}:a]apad=pad_dur=${process.env.QA_GAP ?? 0.12}[a${i}]`).join(";") + ";" + cfg.segments.map((_, i) => `[a${i}]`).join("") + `concat=n=${n}:v=0:a=1[out]`;
const preview = path.join(outDir, "voice-preview.mp3");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-b:a", "128k", preview]);
console.log(`\nPratinjau untuk didengar: ${preview}`);

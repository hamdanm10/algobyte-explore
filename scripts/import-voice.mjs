// Usage: node scripts/import-voice.mjs <folder-video> [--only=id1,id2]
// Contoh: node scripts/import-voice.mjs src/videos/long-001-slug
//
// Untuk VIDEO PANJANG: voice dibuat user sendiri di Google AI Studio (gratis), bukan lewat API.
// User menyimpan satu file audio per segmen/bab di <folder-video>/voice-raw/<id>.<wav|mp3|m4a|ogg|flac>
// (id = "id" segmen di voice-script.json). Skrip ini TIDAK memakai API dan TIDAK menghapus file user.
// Hasil sama dengan scripts/gen-voice.mjs, jadi tahap berikutnya (verify-voice, voice-qa, gen-captions, gen-srt,
// buildTimeline) berjalan tanpa perubahan:
//   <folder-video>/voice/<id>.wav  (hening awal/akhir dibuang, loudnorm -16 LUFS, 44,1 kHz mono)
//   <folder-video>/voice.json      { "<id>": { "dur": detik, "pauses": [[mulai, selesai], ...] } }
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const dir = process.argv[2];
if (!dir || dir.startsWith("--")) throw new Error("Pakai: node scripts/import-voice.mjs <folder-video>");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const rawDir = path.join(dir, "voice-raw");
const outDir = path.join(dir, "voice");
const durFile = path.join(dir, "voice.json");
if (!fs.existsSync(rawDir)) throw new Error(`Folder audio dari AI Studio tidak ada: ${rawDir}`);
fs.mkdirSync(outDir, { recursive: true });
const data = fs.existsSync(durFile) ? JSON.parse(fs.readFileSync(durFile, "utf8")) : {};

const exts = [".wav", ".mp3", ".m4a", ".ogg", ".flac"];
const rawFiles = fs.readdirSync(rawDir);
const missing = [];
const findRaw = (id) => {
  const hits = rawFiles.filter((f) => exts.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)) === id);
  if (hits.length > 1) throw new Error(`Lebih dari satu file untuk segmen "${id}" di ${rawDir}: ${hits.join(", ")}`);
  return hits[0] ? path.join(rawDir, hits[0]) : null;
};

const probe = (wav) =>
  Math.round(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString()) * 100) / 100;

// Sama dengan gen-voice.mjs: jeda >= 0,2 dtk (ambang -35 dB) menandai batas kalimat untuk sinkron animasi
const detectPauses = (wav) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "silencedetect=noise=-35dB:d=0.2", "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return starts.map((s, i) => [Math.round(s * 100) / 100, Math.round((ends[i] ?? s) * 100) / 100]);
};

for (const seg of cfg.segments) {
  if (only && !only.includes(seg.id)) continue;
  const raw = findRaw(seg.id);
  if (!raw) {
    missing.push(seg.id);
    continue;
  }
  const wav = path.join(outDir, `${seg.id}.wav`);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", raw, "-ac", "1",
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar", "44100", wav,
  ]);
  data[seg.id] = { dur: probe(wav), pauses: detectPauses(wav) };
  console.log(`${seg.id}: ${path.basename(raw)} -> ${data[seg.id].dur}s, jeda: ${data[seg.id].pauses.length}`);
}

fs.writeFileSync(durFile, JSON.stringify(data, null, 2) + "\n");
const total = cfg.segments.reduce((a, s) => a + (data[s.id]?.dur ?? 0), 0);
console.log(`total: ${total.toFixed(1)} s (${(total / 60).toFixed(1)} menit)`);
if (missing.length) {
  console.error(`BELUM ADA audio untuk: ${missing.join(", ")} (simpan sebagai ${rawDir}/<id>.wav lalu jalankan lagi dengan --only=...)`);
  process.exit(1);
}

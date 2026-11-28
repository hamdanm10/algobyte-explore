// Usage: node scripts/tighten-voice.mjs <folder-video> [--target=2.65] [--max-pause=0.25] [--min=1.0] [--max=1.25]
// Merapatkan voice TANPA kredit (docs/GEMINI-TTS-VOICE.md bagian 0, resep Shorts "jeda dalam segmen maks 0,25 dtk"):
//   1. hening di dalam segmen yang lebih panjang dari --max-pause dipotong menjadi --max-pause (silenceremove, -40 dB);
//   2. satu faktor atempo untuk SEMUA segmen agar rata-rata tempo = --target kata/dtk (dibatasi --min..--max).
// File asli disalin sekali ke <folder>/voice-orig/ (dijalankan ulang selalu mulai dari file asli).
// Setelah ini: node --env-file=.env scripts/gen-voice.mjs <folder> --measure-only  (ukur ulang dur + pauses di voice.json).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dir = process.argv[2];
if (!dir || dir.startsWith("--")) throw new Error("Pakai: node scripts/tighten-voice.mjs <folder-video> [--target=2.65]");
const arg = (name, def) => parseFloat(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def);
const target = arg("target", 2.65);
const maxPause = arg("max-pause", 0.25);
const minF = arg("min", 1.0);
const maxF = arg("max", 1.25);

const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const voiceDir = path.join(dir, "voice");
const origDir = path.join(dir, "voice-orig");
fs.mkdirSync(origDir, { recursive: true });
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const ff = (inp, af, out) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", inp, "-af", af, "-c:a", "pcm_s16le", out]);
const cut = `silenceremove=stop_periods=-1:stop_duration=${maxPause}:stop_threshold=-40dB:stop_silence=${maxPause}`;

let words = 0;
let cutTotal = 0;
const tmp = {};
for (const seg of cfg.segments) {
  const wav = path.join(voiceDir, `${seg.id}.wav`);
  const orig = path.join(origDir, `${seg.id}.wav`);
  if (!fs.existsSync(orig)) fs.copyFileSync(wav, orig);
  tmp[seg.id] = path.join(origDir, `${seg.id}.cut.wav`);
  ff(orig, cut, tmp[seg.id]);
  words += seg.text.split(/\s+/).filter(Boolean).length;
  cutTotal += dur(tmp[seg.id]);
}
const factor = Math.min(maxF, Math.max(minF, (target * cutTotal) / words));
let total = 0;
for (const seg of cfg.segments) {
  const wav = path.join(voiceDir, `${seg.id}.wav`);
  ff(tmp[seg.id], `atempo=${factor.toFixed(3)}`, wav);
  fs.unlinkSync(tmp[seg.id]);
  const d = dur(wav);
  total += d;
  console.log(`${seg.id.padEnd(8)} ${d.toFixed(2)}s`);
}
console.log(`hening dipotong ke ${maxPause} dtk, atempo ${factor.toFixed(3)}; tempo ${(words / total).toFixed(2)} kata/dtk, total ${total.toFixed(1)} dtk`);
console.log(`Lanjut: node --env-file=.env scripts/gen-voice.mjs ${dir} --measure-only`);

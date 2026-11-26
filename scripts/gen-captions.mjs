// Usage: node scripts/gen-captions.mjs <folder-video> [--model=small] [--only=id1,id2]
// Transkripsi lokal (Whisper di GPU lewat @remotion/whisper-webgpu, gratis, tanpa API key) tiap <folder>/voice/<id>.wav
// -> <folder>/captions.json : { "<id>": Caption[] } dengan waktu RELATIF ke awal file voice segmen itu
// (sesuai panduan Remotion: jangan gabungkan jadi timestamp seluruh komposisi).
// Model multilingual wajib untuk bahasa Indonesia (jangan pakai varian .en). Model diunduh sekali dan di-cache.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { canUseWhisperWebGpu, downloadWhisperModel, loadWhisperModel, toCaptions, transcribe } from "@remotion/whisper-webgpu";

const dir = process.argv[2];
if (!dir || dir.startsWith("--")) throw new Error("Pakai: node scripts/gen-captions.mjs <folder-video>");
const model = process.argv.find((a) => a.startsWith("--model="))?.slice(8) ?? "small";
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

const support = await canUseWhisperWebGpu();
if (!support.supported) throw new Error(`WebGPU tidak didukung: ${support.detailedReason ?? "?"}`);

const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const outFile = path.join(dir, "captions.json");
const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

// Koreksi ejaan: kata Whisper yang mirip kata naskah (selisih kecil) diganti ejaan naskah; dua kata Whisper yang
// bila digabung mirip satu kata naskah (mis. "Provinsi"+"mu") digabung. Angka (mis. "12,4") dibiarkan dari Whisper.
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const near = (a, b) => a.length > 2 && b.length > 2 && lev(a, b) <= Math.max(1, Math.floor(b.length * 0.3));
const snapToScript = (captions, text) => {
  // tanda hubung dipertahankan ("kira-kira"); norm() tetap membuangnya saat membandingkan
  const sw = text.split(/\s+/).map((w) => w.replace(/[^\p{L}-]/gu, "").replace(/^-+|-+$/g, "")).filter(Boolean);
  const out = [];
  let j = 0;
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    const lead = c.text.match(/^\s*/)[0];
    const core = c.text.trim();
    const trail = (core.match(/[.,;:]+$/) ?? [""])[0]; // titik dan koma di akhir kata dibuang
    const keep = core.match(/[?!]+$/)?.[0] ?? "";
    const word = core.slice(0, core.length - (core.match(/[.,;:?!]+$/) ?? [""])[0].length);
    const n = norm(word);
    if (!n) {
      out.push({ ...c, text: lead + word + keep });
      continue;
    }
    let hit = null;
    for (let k = j; k < Math.min(sw.length, j + 8) && !hit; k++) {
      const t = norm(sw[k]);
      const next = captions[i + 1];
      // cek penggabungan dua kata lebih dulu, supaya "Provinsi"+"mu" tidak cocok sebagian dengan "Provinsimu"
      // gabung hanya bila lebih cocok daripada kata ini saja DAN daripada kata berikutnya saja
      // (kalau tidak, "ke"+"Merauke" dianggap "Merauke" dan kata "ke" hilang)
      if (next && near(n + norm(next.text), t) && lev(n + norm(next.text), t) < lev(n, t) && lev(n + norm(next.text), t) < lev(norm(next.text), t))
        hit = { k, merge: true };
      else if (near(n, t)) hit = { k, merge: false };
    }
    if (!hit) {
      out.push({ ...c, text: lead + word + keep });
      continue;
    }
    j = hit.k + 1;
    if (hit.merge) {
      const next = captions[++i];
      const tail = next.text.trim().match(/[?!]+$/)?.[0] ?? "";
      out.push({ ...c, text: lead + sw[hit.k] + tail, endMs: next.endMs, timestampMs: Math.round((c.startMs + next.endMs) / 2) });
    } else {
      out.push({ ...c, text: lead + sw[hit.k] + keep });
    }
    void trail;
  }
  return out;
};

// wav -> float32 mono 16 kHz lewat ffmpeg
const waveform = (wav) => {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", wav, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], {
    maxBuffer: 1 << 28,
  });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
};

await downloadWhisperModel({ model });
await using handle = await loadWhisperModel({ model });
for (const seg of cfg.segments) {
  if (only && !only.includes(seg.id)) continue;
  const wav = path.join(dir, "voice", `${seg.id}.wav`);
  const result = await transcribe({ channelWaveform: waveform(wav), model, language: "indonesian" });
  const { captions } = toCaptions({ whisperWebGpuOutput: result });
  const snapped = snapToScript(captions, seg.text);
  all[seg.id] = snapped;
  console.log(`[${seg.id}] ${snapped.length} kata`);
  console.log(`   naskah : ${seg.text}`);
  console.log(`   whisper: ${result.text.trim()}`);
  console.log(`   caption: ${snapped.map((c) => c.text).join("").trim()}`);
}
fs.writeFileSync(outFile, JSON.stringify(all, null, 2) + "\n");
console.log("tersimpan:", outFile);

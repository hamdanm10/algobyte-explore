// Usage: node scripts/gen-srt.mjs <folder-video> <out/NNN-slug/subtitle.srt>
// Contoh: node scripts/gen-srt.mjs src/videos/006-slug out/006-slug/subtitle.srt
//
// Membuat subtitle .srt (bahasa Indonesia) untuk diupload ke YouTube, dari:
//   <folder>/captions.json   (kata per segmen, waktu relatif ke awal file voice; ejaan sudah dikoreksi gen-captions)
//   <folder>/voice.json      (durasi voice per segmen)
//   <folder>/voice-script.json (urutan segmen + "timeline": { "gapSeconds", "voiceLead", "fps" })
// Waktu dihitung dengan rumus yang SAMA dengan src/shared/lib/timeline.ts (buildTimeline), jadi data.ts video harus
// memakai nilai timeline yang sama (baca dari voice-script.json). Default = resep aktif: gap 0,12 dtk, lead 1 frame, 30 fps.
// Satu cue = frasa pendek: maks 7 kata / 42 karakter / 3 dtk, putus di tanda tanya/seru atau jeda > 0,35 dtk.
import fs from "node:fs";
import path from "node:path";

const [dir, outFile] = process.argv.slice(2);
if (!dir || !outFile) throw new Error("Pakai: node scripts/gen-srt.mjs <folder-video> <file.srt>");
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const voice = JSON.parse(fs.readFileSync(path.join(dir, "voice.json"), "utf8"));
const caps = JSON.parse(fs.readFileSync(path.join(dir, "captions.json"), "utf8"));
const { gapSeconds = 0.12, voiceLead = 1, fps = 30 } = cfg.timeline ?? {};

const ts = (ms) => {
  const t = Math.max(0, Math.round(ms));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)},${p(t % 1000, 3)}`;
};

const cues = [];
let segStartFrame = 0;
for (const seg of cfg.segments) {
  const words = caps[seg.id];
  if (!words || !voice[seg.id]) throw new Error(`Segmen ${seg.id} tidak ada di captions.json/voice.json`);
  const offsetMs = ((segStartFrame + voiceLead) / fps) * 1000;
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((w) => w.text).join("").trim();
    cues.push({ start: offsetMs + cur[0].startMs, end: offsetMs + cur[cur.length - 1].endMs, text });
    cur = [];
  };
  words.forEach((w, i) => {
    const next = words[i + 1];
    cur.push(w);
    const text = cur.map((x) => x.text).join("").trim();
    const long = cur.length >= 7 || text.length >= 42 || w.endMs - cur[0].startMs >= 3000;
    const pause = next && next.startMs - w.endMs > 350;
    if (/[?!]$/.test(w.text.trim()) || long || pause || !next) flush();
  });
  segStartFrame += Math.ceil((voice[seg.id].dur + gapSeconds) * fps);
}
// Cue tidak boleh tumpang tindih; beri jeda tampil minimal 0,8 dtk bila ada ruang
cues.forEach((c, i) => {
  const next = cues[i + 1];
  const want = Math.max(c.end, c.start + 800);
  c.end = next ? Math.min(want, next.start - 20) : want;
});
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n"));
console.log(`${cues.length} cue, berakhir ${ts(cues[cues.length - 1].end)} -> ${outFile}`);

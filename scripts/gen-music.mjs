// Usage: node --env-file=.env scripts/gen-music.mjs [--only=id1,id2]
// Membuat musik latar INSTRUMENTAL lewat ElevenLabs Eleven Music -> public/music/<id>.mp3
// dan memperbarui dua katalog (pola sama dengan SFX):
//   public/music/music-index.json  : ringkas, untuk MEMILIH (id, tag, mood, cocok untuk apa, bpm, durasi)
//   public/music/music-detail.json : lengkap (file, prompt, volume, catatan, sumber, tanggal)
// Biaya teramati 750 kredit per menit (plan Starter; halaman harga menyebut sekitar 900) dari pool kredit yang sama dengan SFX. Dicatat otomatis ke docs/usage/elevenlabs.jsonl.
// Id yang file-nya sudah ada DILEWATI (tidak membuang kredit); pakai --only=<id> untuk membuat ulang.
// Lihat docs/ELEVENLABS-MUSIC.md (lisensi, prompt, parameter).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { trackEleven } from "./lib/usage.mjs";

const key = process.env.ELEVEN_LABS_API_KEY;
if (!key) throw new Error("ELEVEN_LABS_API_KEY tidak ada di environment");

// Tambah lagu baru cukup dengan menambah item di sini.
const MUSIC = [
  {
    id: "calm-explainer-01",
    prompt:
      "Instrumental background music for a short educational data explainer video. Calm yet modern, 100 BPM, soft electronic pads, light plucked synth melody, gentle muted percussion, warm subtle bass, clean minimal mix, steady energy with no sudden changes, instrumental only, sits quietly under a voiceover",
    seconds: 60,
    bpm: 100,
    tags: ["explainer", "edukasi", "data", "elektronik", "ambient"],
    mood: ["calm", "modern", "curious"],
    fit: "narasi edukasi/data di bawah voiceover, energi stabil tanpa perubahan mendadak",
    volume: 0.1,
    note: "Pelan di bawah voice (sekitar 0,10). Tidak dijamin bisa di-loop mulus: untuk video di atas 60 dtk beri fade.",
  },
];

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const dir = "public/music";
fs.mkdirSync(dir, { recursive: true });
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
const indexFile = `${dir}/music-index.json`;
const detailFile = `${dir}/music-detail.json`;
const index = readJson(indexFile, { version: 1, items: [] });
const detail = readJson(detailFile, { version: 1, items: {} });

for (const m of MUSIC) {
  if (only && !only.includes(m.id)) continue;
  const file = `${dir}/${m.id}.mp3`;
  if (fs.existsSync(file) && !only) {
    console.log(`${m.id}: sudah ada, dilewati`);
  } else {
    const buf = await trackEleven(
      key,
      { action: "music", id: m.id, seconds: m.seconds, estimateCredits: Math.round(m.seconds * 12.5), model: "music_v2_5" },
      async () => {
        const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
          method: "POST",
          headers: { "content-type": "application/json", "xi-api-key": key },
          body: JSON.stringify({
            prompt: m.prompt,
            music_length_ms: m.seconds * 1000,
            model_id: "music_v2_5",
            force_instrumental: true,
          }),
          signal: AbortSignal.timeout(300000),
        });
        if (!res.ok) throw new Error(`${m.id}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
        return Buffer.from(await res.arrayBuffer());
      },
    );
    fs.writeFileSync(file, buf);
    console.log(`${m.id}: dibuat (${(buf.length / 1e6).toFixed(2)} MB)`);
  }
  const dur =
    Math.round(
      parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString()) * 100,
    ) / 100;
  const row = { id: m.id, tags: m.tags, mood: m.mood, bpm: m.bpm, fit: m.fit, dur };
  const at = index.items.findIndex((i) => i.id === m.id);
  if (at >= 0) index.items[at] = row;
  else index.items.push(row);
  detail.items[m.id] = {
    file: `music/${m.id}.mp3`,
    prompt: m.prompt,
    volume: m.volume,
    note: m.note,
    model: "music_v2_5",
    source: "ElevenLabs Eleven Music (instrumental)",
    created: new Date().toISOString().slice(0, 10),
  };
}

fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
fs.writeFileSync(detailFile, JSON.stringify(detail, null, 2) + "\n");
console.log(`katalog: ${index.items.length} lagu`);

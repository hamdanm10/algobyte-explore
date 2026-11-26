// Usage: node --env-file=.env scripts/gen-sfx.mjs [--only=id1,id2]
// Membuat SFX lewat ElevenLabs Sound Generation -> public/sfx/<id>.mp3
// dan memperbarui DUA katalog JSON (dipecah supaya tidak membengkak jadi ribuan baris):
//   public/sfx/sfx-index.json   : ringkas, dibaca AI untuk MEMILIH SFX (id, tag, mood, cocok untuk apa, durasi)
//   public/sfx/sfx-detail.json  : lengkap per id, dibaca hanya untuk SFX yang sudah dipilih (file, prompt, volume, catatan)
// Key dibaca dari env ELEVEN_LABS_API_KEY, tidak pernah dicetak.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { elevenSnapshot, logUsage, trackEleven, waitForBalanceChange } from "./lib/usage.mjs";

const key = process.env.ELEVEN_LABS_API_KEY;
if (!key) throw new Error("ELEVEN_LABS_API_KEY tidak ada di environment");

// Tambah SFX baru cukup dengan menambah item di sini lalu jalankan ulang (id yang sudah ada dilewati).
const SFX = [
  {
    id: "whoosh-camera",
    prompt: "smooth cinematic whoosh, camera swoosh transition, soft airy, no music",
    seconds: 1.0,
    tags: ["whoosh", "transition", "camera", "swoosh"],
    mood: ["smooth", "neutral"],
    fit: "pergerakan kamera atau pindah lokasi/scene peta",
    volume: 0.5,
    note: "Mulai tepat saat kamera mulai bergerak.",
  },
  {
    id: "rise-grow",
    prompt: "short rising low rumble swell that builds up and stops cleanly, cinematic, no music",
    seconds: 1.5,
    tags: ["rise", "swell", "build", "grow"],
    mood: ["tension", "anticipation"],
    fit: "batang/objek yang naik atau tumbuh, build-up sebelum reveal",
    volume: 0.45,
    note: "Selaraskan puncaknya dengan akhir animasi naik.",
  },
  {
    id: "tick-counter",
    prompt: "fast soft digital ticking counter, rapid light clicks, clean, no music",
    seconds: 1.3,
    tags: ["tick", "counter", "digital", "click"],
    mood: ["light", "techy"],
    fit: "angka yang berhitung naik",
    volume: 0.3,
    note: "Pelan, jangan menutupi voice.",
  },
  {
    id: "impact-boom",
    prompt: "deep cinematic impact boom with sub bass, short, punchy, clean tail",
    seconds: 1.5,
    tags: ["impact", "boom", "hit", "bass"],
    mood: ["dramatic", "powerful"],
    fit: "momen reveal penting, hasil peringkat 1, angka mendarat",
    volume: 0.55,
    note: "Pakai hemat, 1-2 kali per video supaya tetap terasa.",
  },
  {
    id: "pop-ui",
    prompt: "soft UI pop, short clean bubble pop notification, no music",
    seconds: 0.5,
    tags: ["pop", "ui", "appear", "notification"],
    mood: ["light", "friendly"],
    fit: "kartu/teks muncul di layar",
    volume: 0.4,
    note: "Cocok untuk muncul teks atau label.",
  },
  {
    id: "sting-reveal",
    prompt: "short uplifting reveal chime sting, bright, positive, 1.5 seconds, no vocals",
    seconds: 1.5,
    tags: ["sting", "chime", "reveal", "outro"],
    mood: ["uplifting", "positive"],
    fit: "kesimpulan atau penutup video",
    volume: 0.45,
    note: "Taruh saat teks kesimpulan muncul.",
  },
];

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const dir = "public/sfx";
fs.mkdirSync(dir, { recursive: true });
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
const indexFile = `${dir}/sfx-index.json`;
const detailFile = `${dir}/sfx-detail.json`;
const index = readJson(indexFile, { version: 1, items: [] });
const detail = readJson(detailFile, { version: 1, items: {} });

const generated = [];
const batchStart = await elevenSnapshot(key);
for (const s of SFX) {
  if (only && !only.includes(s.id)) continue;
  const file = `${dir}/${s.id}.mp3`;
  if (fs.existsSync(file) && !only) {
    console.log(`${s.id}: sudah ada, dilewati`);
  } else {
    // wait=false: saldo API terlambat diperbarui, jadi selisih sebenarnya dihitung sekali per batch (di bawah)
    const buf = await trackEleven(
      key,
      { action: "sfx", id: s.id, seconds: s.seconds, estimateCredits: Math.round(s.seconds * 10), model: "eleven_text_to_sound_v2" },
      async () => {
        const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
          method: "POST",
          headers: { "content-type": "application/json", "xi-api-key": key },
          body: JSON.stringify({ text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.5 }),
        });
        if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
        return Buffer.from(await res.arrayBuffer());
      },
      { wait: false },
    );
    fs.writeFileSync(file, buf);
    generated.push(s);
    console.log(`${s.id}: dibuat`);
  }
  const dur =
    Math.round(
      parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString()) * 100,
    ) / 100;

  const row = { id: s.id, tags: s.tags, mood: s.mood, fit: s.fit, dur };
  const at = index.items.findIndex((i) => i.id === s.id);
  if (at >= 0) index.items[at] = row;
  else index.items.push(row);
  detail.items[s.id] = {
    file: `sfx/${s.id}.mp3`,
    prompt: s.prompt,
    volume: s.volume,
    note: s.note,
    source: "ElevenLabs Sound Generation",
    created: new Date().toISOString().slice(0, 10),
  };
}

if (generated.length && batchStart) {
  const end = await waitForBalanceChange(key, batchStart.used);
  const actual = end ? end.used - batchStart.used : null;
  logUsage("elevenlabs.jsonl", {
    service: "elevenlabs",
    action: "sfx-batch",
    ids: generated.map((g) => g.id),
    seconds: generated.reduce((a, g) => a + g.seconds, 0),
    estimateCredits: generated.reduce((a, g) => a + Math.round(g.seconds * 10), 0),
    creditsActual: actual,
    balance: end ? { tier: end.tier, used: end.used, limit: end.limit, remaining: end.limit - end.used } : null,
  });
  console.log(`kredit batch: perkiraan ${generated.reduce((a, g) => a + Math.round(g.seconds * 10), 0)}, tercatat ${actual}`);
}

fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
fs.writeFileSync(detailFile, JSON.stringify(detail, null, 2) + "\n");
console.log(`katalog: ${index.items.length} SFX`);

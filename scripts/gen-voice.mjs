// Usage:
//   node --env-file=.env scripts/gen-voice.mjs <folder-video> [--only=id1,id2] [--measure-only]
// Contoh: node --env-file=.env scripts/gen-voice.mjs src/videos/001-top-provinsi-terpadat
//
// Membaca <folder-video>/voice-script.json:
//   { "model": "...", "voice": "Kore", "style": "..." | null, "segments": [{ "id": "hook", "text": "..." }] }
//   Provider ElevenLabs: { "provider": "elevenlabs", "model": "eleven_multilingual_v2", "voiceId": "...", "voice": "<nama>",
//     "voiceSettings": { "stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "speed": 1.0 }, "segments": [...] }  (key: ELEVEN_LABS_API_KEY)
// Menulis <folder-video>/voice/<id>.wav dan <folder-video>/voice.json:
//   { "<id>": { "dur": detik, "pauses": [[mulai, selesai], ...] } }  (jeda dipakai untuk sinkron animasi)
// Key dibaca dari env GEMINI_API_KEY, tidak pernah dicetak.
// Lihat docs/GEMINI-TTS-VOICE.md untuk catatan praktik terbaik.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { logUsage, elevenSnapshot, waitForBalanceChange } from "./lib/usage.mjs";

const dir = process.argv[2];
if (!dir || dir.startsWith("--")) throw new Error("Pakai: node --env-file=.env scripts/gen-voice.mjs <folder-video>");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const measureOnly = process.argv.includes("--measure-only");

const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));
const outDir = path.join(dir, "voice");
const durFile = path.join(dir, "voice.json");
fs.mkdirSync(outDir, { recursive: true });
const data = fs.existsSync(durFile) ? JSON.parse(fs.readFileSync(durFile, "utf8")) : {};

const probe = (wav) =>
  Math.round(
    parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString()) * 100,
  ) / 100;

// Deteksi jeda >= 0.2 dtk (ambang -35 dB) untuk menandai batas kalimat
const detectPauses = (wav) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "silencedetect=noise=-35dB:d=0.2", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return starts.map((s, i) => [Math.round(s * 100) / 100, Math.round((ends[i] ?? s) * 100) / 100]);
};

const eleven = cfg.provider === "elevenlabs";
const key = eleven ? process.env.ELEVEN_LABS_API_KEY : process.env.GEMINI_API_KEY;
if (!measureOnly && !key) throw new Error(`${eleven ? "ELEVEN_LABS_API_KEY" : "GEMINI_API_KEY"} tidak ada di environment`);
const snapBefore = eleven && !measureOnly ? await elevenSnapshot(key) : null;
let elevenChars = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastUsage = null; // usageMetadata dari respons terakhir (token), dicatat ke docs/usage/gemini.jsonl
const synthEleven = async (text, ctx = {}) => {
  // pcm_24000 = PCM 16-bit mono 24 kHz, sama dengan keluaran Gemini, jadi pipeline ffmpeg di bawah tidak berubah
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=pcm_24000`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": key },
    body: JSON.stringify({ text, model_id: cfg.model, language_code: "id", voice_settings: cfg.voiceSettings, ...(cfg.seed != null ? { seed: cfg.seed } : {}), ...ctx }),
  });
  if (!res.ok) throw new Error(`${cfg.model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  elevenChars += text.length;
  return Buffer.from(await res.arrayBuffer());
};
const synth = async (text) => {
  if (eleven) return synthEleven(text);
  const prompt = cfg.style ? `${cfg.style} ${text}` : text;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`${cfg.model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  lastUsage = json.usageMetadata ?? null;
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error(`${cfg.model}: tidak ada audio`);
  return Buffer.from(part.inlineData.data, "base64");
};

for (const [si, seg] of cfg.segments.entries()) {
  // Konteks tetangga (previous_text/next_text) menjaga intonasi antar-segmen pada ElevenLabs
  const ctx = {};
  if (cfg.segments[si - 1]) ctx.previous_text = cfg.segments[si - 1].text;
  if (cfg.segments[si + 1]) ctx.next_text = cfg.segments[si + 1].text;
  if (only && !only.includes(seg.id)) continue;
  const wav = path.join(outDir, `${seg.id}.wav`);
  if (!measureOnly) {
    let pcm;
    for (let attempt = 1; attempt <= 2 && !pcm; attempt++) {
      try {
        pcm = eleven ? await synthEleven(seg.text, ctx) : await synth(seg.text);
      } catch (e) {
        console.error(`[${seg.id}] ${String(e.message).slice(0, 200)}`);
        await sleep(5000);
      }
    }
    if (!pcm) throw new Error(`Gagal membuat voice untuk ${seg.id}`);
    const raw = path.join(outDir, `${seg.id}.pcm`);
    fs.writeFileSync(raw, pcm);
    // PCM 16-bit mono 24kHz -> wav, buang hening awal/akhir, normalisasi loudness (-16 LUFS)
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw,
      "-af",
      "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
      "-ar", "44100", wav,
    ]);
    fs.unlinkSync(raw); // hanya file .pcm sementara yang baru dibuat skrip ini
    if (!eleven) logUsage("gemini.jsonl", {
      service: "gemini",
      action: "tts",
      model: cfg.model,
      voice: cfg.voice,
      folder: dir,
      id: seg.id,
      chars: seg.text.length,
      promptTokens: lastUsage?.promptTokenCount ?? null,
      outputTokens: lastUsage?.candidatesTokenCount ?? null,
      totalTokens: lastUsage?.totalTokenCount ?? null,
    });
  }
  data[seg.id] = { dur: probe(wav), pauses: detectPauses(wav) };
  console.log(`${seg.id}: ${data[seg.id].dur}s, jeda: ${JSON.stringify(data[seg.id].pauses)}`);
  if (!measureOnly) await sleep(eleven ? 1000 : 7000);
}

if (eleven && !measureOnly && elevenChars) {
  const end = snapBefore ? await waitForBalanceChange(key, snapBefore.used) : null;
  logUsage("elevenlabs.jsonl", {
    service: "elevenlabs", action: "tts", model: cfg.model, voice: cfg.voice, voiceId: cfg.voiceId, folder: dir,
    ids: cfg.segments.filter((x) => !only || only.includes(x.id)).map((x) => x.id), chars: elevenChars,
    creditsActual: end && snapBefore ? end.used - snapBefore.used : null,
    balance: end ? { tier: end.tier, used: end.used, limit: end.limit, remaining: end.limit - end.used } : null,
  });
  console.log(`kredit ElevenLabs: ${elevenChars} karakter, tercatat ${end && snapBefore ? end.used - snapBefore.used : "?"}`);
}
fs.writeFileSync(durFile, JSON.stringify(data, null, 2) + "\n");
console.log("total:", Object.values(data).reduce((a, b) => a + b.dur, 0).toFixed(2), "s");

// Usage: node --env-file=.env scripts/verify-voice.mjs <folder-video>
// Transkripsi tiap voice/<id>.wav lewat Gemini lalu bandingkan dengan teks naskah,
// untuk memastikan model TTS tidak membacakan instruksi gaya atau salah baca.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Pakai: node --env-file=.env scripts/verify-voice.mjs <folder-video>");
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY tidak ada di environment");
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "voice-script.json"), "utf8"));

for (const seg of cfg.segments) {
  const wav = fs.readFileSync(path.join(dir, "voice", `${seg.id}.wav`));
  let res;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
    method: "POST",
    signal: AbortSignal.timeout(90000),
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: "Transkripsikan audio ini kata per kata persis seperti diucapkan, dalam bahasa aslinya. Hanya keluarkan transkrip." },
            { inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } },
          ],
        },
      ],
    }),
  });
  } catch (e) {
    console.log(`${seg.id}: gagal (${e.name})`);
    continue;
  }
  if (!res.ok) {
    console.log(`${seg.id}: HTTP ${res.status}`);
    continue;
  }
  const json = await res.json();
  const heard = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  const words = (t) => t.split(/\s+/).filter(Boolean).length;
  console.log(`\n[${seg.id}] naskah ${words(seg.text)} kata, terdengar ${words(heard ?? "")} kata`);
  console.log(`  naskah : ${seg.text}`);
  console.log(`  dengar : ${heard}`);
  await new Promise((r) => setTimeout(r, 3000));
}

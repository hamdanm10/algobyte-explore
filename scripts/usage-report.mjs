// Usage: node --env-file=.env scripts/usage-report.mjs [--since=YYYY-MM]
// Ringkasan pemakaian dari docs/usage/*.jsonl + saldo kredit ElevenLabs saat ini (bila key tersedia).
import fs from "node:fs";
import { elevenSnapshot } from "./lib/usage.mjs";

const since = process.argv.find((a) => a.startsWith("--since="))?.slice(8) ?? "";
const read = (f) =>
  fs.existsSync(`docs/usage/${f}`)
    ? fs.readFileSync(`docs/usage/${f}`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.ts >= since)
    : [];

const el = read("elevenlabs.jsonl");
console.log(`== ElevenLabs (${el.length} pembuatan${since ? `, sejak ${since}` : ""}) ==`);
const byAction = {};
for (const e of el) {
  const a = (byAction[e.action] ??= { n: 0, seconds: 0, est: 0, actual: 0, unknown: 0 });
  a.n++;
  a.seconds += e.seconds ?? 0;
  a.est += e.estimateCredits ?? 0;
  if (e.creditsActual == null) a.unknown++;
  else a.actual += e.creditsActual;
}
for (const [k, a] of Object.entries(byAction)) {
  console.log(`  ${k}: ${a.n}x, ${a.seconds.toFixed(1)} dtk audio, perkiraan ${a.est} kredit, tercatat ${a.actual} kredit${a.unknown ? ` (${a.unknown} tanpa saldo)` : ""}`);
}
const key = process.env.ELEVEN_LABS_API_KEY;
const snap = key ? await elevenSnapshot(key) : null;
if (snap) {
  const reset = snap.resetUnix ? new Date(snap.resetUnix * 1000).toISOString().slice(0, 10) : "?";
  console.log(`  saldo sekarang: dipakai ${snap.used} dari ${snap.limit} kredit (sisa ${snap.limit - snap.used}), plan ${snap.tier}, reset ${reset}`);
} else {
  console.log("  saldo sekarang: tidak tersedia (key kosong atau API gagal)");
}

const gm = read("gemini.jsonl");
console.log(`\n== Gemini (${gm.length} pembuatan) ==`);
const byModel = {};
for (const e of gm) {
  const m = (byModel[e.model] ??= { n: 0, inTok: 0, outTok: 0 });
  m.n++;
  m.inTok += e.promptTokens ?? 0;
  m.outTok += e.outputTokens ?? 0;
}
for (const [k, m] of Object.entries(byModel)) console.log(`  ${k}: ${m.n}x, token masuk ${m.inTok}, token keluar (audio) ${m.outTok}`);
if (!gm.length) console.log("  belum ada catatan");

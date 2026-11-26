// Pelacakan pemakaian API berbayar. Log append-only (satu JSON per baris) di docs/usage/:
//   elevenlabs.jsonl : tiap pembuatan SFX/musik, dengan perkiraan kredit DAN selisih saldo sebenarnya
//   gemini.jsonl     : tiap pembuatan voice, dengan jumlah token dari API
// Laporan: node --env-file=.env scripts/usage-report.mjs [--since=YYYY-MM]
// Key hanya dipakai untuk memanggil API dan tidak pernah dicetak/dicatat.
import fs from "node:fs";
import path from "node:path";

const DIR = "docs/usage";

export const logUsage = (file, entry) => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.appendFileSync(path.join(DIR, file), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
};

// Saldo kredit ElevenLabs (pool yang sama untuk SFX, musik, TTS). `used`/`limit` = kredit periode berjalan.
export const elevenSnapshot = async (key) => {
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { tier: j.tier, used: j.character_count, limit: j.character_limit, resetUnix: j.next_character_count_reset_unix ?? null };
  } catch {
    return null;
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Saldo di API TERLAMBAT diperbarui (teramati sekitar 20 detik setelah generate). Tunggu sampai berubah.
export const waitForBalanceChange = async (key, usedBefore, maxMs = 60000) => {
  const start = Date.now();
  let snap = await elevenSnapshot(key);
  while (snap && snap.used === usedBefore && Date.now() - start < maxMs) {
    await sleep(5000);
    snap = await elevenSnapshot(key);
  }
  return snap;
};

// Jalankan `fn` (panggilan generate) sambil mencatat saldo sebelum/sesudah.
// meta: { action: "sfx"|"music", id, seconds, estimateCredits, model }
// opsi wait=false: jangan menunggu saldo (untuk batch banyak SFX); creditsActual dicatat null dan dihitung per-batch.
export const trackEleven = async (key, meta, fn, { wait = true } = {}) => {
  const before = await elevenSnapshot(key);
  const result = await fn();
  const after = wait && before ? await waitForBalanceChange(key, before.used) : await elevenSnapshot(key);
  const actual = wait && before && after ? after.used - before.used : null;
  logUsage("elevenlabs.jsonl", {
    service: "elevenlabs",
    ...meta,
    creditsActual: actual,
    balance: after ? { tier: after.tier, used: after.used, limit: after.limit, remaining: after.limit - after.used } : null,
  });
  return result;
};

// Usage: node scripts/yt-manual.mjs <no atau youtubeId> <metrik> <jendela> <nilai> [sumber]
// Menyimpan angka yang hanya ada di YouTube Studio (ditempel user) ke tabel manual_metrics di data/youtube.db.
// Contoh: node scripts/yt-manual.mjs 006 viewedPct d3 78.5 studio-screenshot
//         node scripts/yt-manual.mjs L001 ctrPct d7 5.2
// Metrik yang dipakai: viewedPct (Viewed vs Swiped Away, %), ctrPct (CTR impresi thumbnail, %), impressions.
import { openDb, readLog } from "./lib/ytdb.mjs";

const [key, metric, win, value, source = "user"] = process.argv.slice(2);
if (!key || !metric || !win || value == null || !Number.isFinite(Number(value))) {
  console.error("Usage: node scripts/yt-manual.mjs <no|youtubeId> <metrik> <jendela> <nilai> [sumber]");
  process.exit(1);
}
const id = readLog().find((l) => l.no === key)?.youtubeId ?? key;
const db = openDb();
if (!db.prepare("SELECT 1 FROM videos WHERE video_id = ?").get(id)) {
  console.error(`Video ${key} (${id}) belum ada di database; jalankan yt-sync.mjs dulu`);
  process.exit(1);
}
db.prepare(`INSERT INTO manual_metrics VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(video_id, metric, win) DO UPDATE SET
  value = excluded.value, source = excluded.source, entered_at = excluded.entered_at`).run(id, metric, win, Number(value), source, new Date().toISOString());
console.log(`tersimpan: ${key} ${metric} ${win} = ${value}`);

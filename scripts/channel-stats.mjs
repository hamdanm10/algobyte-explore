// Usage: node --env-file=.env scripts/channel-stats.mjs [--max=50] [--no-save]
// Statistik PUBLIK channel lewat YouTube Data API v3 (hanya butuh YOUTUBE_API_KEY, tanpa Python/venv).
// Mencetak tabel video + perubahan sejak snapshot terakhir, lalu menambahkan snapshot ke docs/performance/snapshots.jsonl.
// TIDAK memuat data privat (Viewed vs Swiped Away, retensi, sumber trafik): itu butuh OAuth, user menempelkannya dari YouTube Studio.
// Biaya kuota sekitar 3-4 unit dari 10.000 per hari. Key tidak pernah dicetak.
import fs from "node:fs";

const key = process.env.YOUTUBE_API_KEY;
if (!key) throw new Error("YOUTUBE_API_KEY tidak ada di environment");
const CHANNEL_ID = "UCiM2lNuiMKrpqH4o4lKsGkg"; // @algobyte.explore
const max = parseInt(process.argv.find((a) => a.startsWith("--max="))?.slice(6) ?? "50", 10);
const save = !process.argv.includes("--no-save");

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200).replace(key, "***")}`);
  return res.json();
};

const ch = (await api("channels", { part: "snippet,statistics,contentDetails", id: CHANNEL_ID })).items?.[0];
if (!ch) throw new Error("Channel tidak ditemukan");
const uploads = ch.contentDetails.relatedPlaylists.uploads;
const items = (await api("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: String(Math.min(max, 50)) })).items ?? [];
const ids = items.map((i) => i.contentDetails.videoId);
const vids = ids.length ? (await api("videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") })).items : [];

const dur = (iso) => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};
const now = Date.now();
const rows = vids
  .map((v) => {
    const views = +v.statistics.viewCount || 0;
    const likes = +v.statistics.likeCount || 0;
    const comments = +v.statistics.commentCount || 0;
    const days = Math.max((now - Date.parse(v.snippet.publishedAt)) / 864e5, 0.01);
    return {
      id: v.id,
      title: v.snippet.title,
      published: v.snippet.publishedAt.slice(0, 10),
      ageDays: Math.round(days * 10) / 10,
      seconds: dur(v.contentDetails.duration),
      views,
      likes,
      comments,
      viewsPerDay: Math.round((views / days) * 10) / 10,
      likePct: views ? Math.round((likes / views) * 1000) / 10 : 0,
      commentPct: views ? Math.round((comments / views) * 10000) / 100 : 0,
    };
  })
  .sort((a, b) => b.published.localeCompare(a.published));

const snapFile = "docs/performance/snapshots.jsonl";
const last = fs.existsSync(snapFile)
  ? fs.readFileSync(snapFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).at(-1)
  : null;
const snap = {
  ts: new Date().toISOString(),
  subs: +ch.statistics.subscriberCount,
  totalViews: +ch.statistics.viewCount,
  videoCount: +ch.statistics.videoCount,
  videos: Object.fromEntries(rows.map((r) => [r.id, { title: r.title, views: r.views, likes: r.likes, comments: r.comments }])),
};

console.log(`Channel: ${ch.snippet.title} | subscriber ${snap.subs} | total views ${snap.totalViews} | video ${snap.videoCount}`);
if (last) {
  console.log(
    `Sejak snapshot ${last.ts.slice(0, 16)}: subscriber ${snap.subs - last.subs >= 0 ? "+" : ""}${snap.subs - last.subs}, total views ${snap.totalViews - last.totalViews >= 0 ? "+" : ""}${snap.totalViews - last.totalViews}`,
  );
} else {
  console.log("Snapshot pertama (belum ada pembanding).");
}
console.log("\ntayang      umur(hari) durasi  views  views/hari  like%  komen%  perubahan views  judul");
for (const r of rows) {
  const prev = last?.videos?.[r.id]?.views;
  const delta = prev == null ? "baru" : `${r.views - prev >= 0 ? "+" : ""}${r.views - prev}`;
  const mmss = `${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}`;
  console.log(
    `${r.published}  ${String(r.ageDays).padStart(9)}  ${mmss.padStart(6)}  ${String(r.views).padStart(5)}  ${String(r.viewsPerDay).padStart(10)}  ${String(r.likePct).padStart(5)}  ${String(r.commentPct).padStart(6)}  ${delta.padStart(15)}  ${r.title}   [${r.id}]`,
  );
}

if (save) {
  fs.mkdirSync("docs/performance", { recursive: true });
  fs.appendFileSync(snapFile, JSON.stringify(snap) + "\n");
  console.log(`\nsnapshot disimpan: ${snapFile}`);
}

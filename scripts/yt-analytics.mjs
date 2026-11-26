// Usage: node --env-file=.env scripts/yt-analytics.mjs [--ids=VIDEOID,VIDEOID] [--retention]
// Metrik PRIVAT per video dari YouTube Analytics API v2 (OAuth read-only; login sekali dengan scripts/yt-oauth.mjs).
// Tanpa --ids: semua video channel. Hasil: docs/performance/analytics-latest.json + tabel ringkas di terminal.
// Per video: views, engagedViews (bila tersedia), averageViewDuration (dtk), averageViewPercentage, subscribersGained,
// likes, comments, shares, sumber trafik (% per jenis, termasuk SHORTS = feed Shorts), dan dengan --retention kurva
// audienceWatchRatio (detik terbesar penurunan). Viewed vs Swiped Away TIDAK tersedia di API: tetap dari YouTube Studio.
// Data Analytics terlambat sekitar 1-2 hari.
import fs from "node:fs";

const { YT_OAUTH_CLIENT_ID: id, YT_OAUTH_CLIENT_SECRET: secret, YT_OAUTH_REFRESH_TOKEN: refresh } = process.env;
if (!id || !secret || !refresh) throw new Error("OAuth belum disiapkan: jalankan node --env-file=.env scripts/yt-oauth.mjs");
const onlyIds = process.argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",").filter(Boolean);
const withRetention = process.argv.includes("--retention");

const tok = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
});
const tj = await tok.json();
if (!tok.ok) {
  throw new Error(`Token gagal (${tj.error}). Bila "invalid_grant": token kedaluwarsa (mode Testing sekitar 7 hari), login ulang dengan scripts/yt-oauth.mjs`);
}
const H = { authorization: `Bearer ${tj.access_token}` };
const today = new Date().toISOString().slice(0, 10);
const report = async (params) => {
  const u = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  for (const [k, v] of Object.entries({ ids: "channel==MINE", startDate: "2025-09-01", endDate: today, ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(`${r.status} ${j.error?.message ?? ""}`), { status: r.status });
  const cols = j.columnHeaders.map((c) => c.name);
  return (j.rows ?? []).map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));
};

const BASE = "views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares";
let rows;
try {
  rows = await report({ dimensions: "video", metrics: `${BASE},engagedViews`, sort: "-views", maxResults: "200" });
} catch (e) {
  if (e.status !== 400) throw e;
  rows = await report({ dimensions: "video", metrics: BASE, sort: "-views", maxResults: "200" }); // engagedViews tidak didukung
}
if (onlyIds) rows = rows.filter((r) => onlyIds.includes(r.video));

for (const r of rows) {
  const t = await report({ dimensions: "insightTrafficSourceType", metrics: "views", filters: `video==${r.video}` });
  const total = t.reduce((a, x) => a + x.views, 0) || 1;
  r.traffic = Object.fromEntries(t.sort((a, b) => b.views - a.views).map((x) => [x.insightTrafficSourceType, Math.round((x.views / total) * 1000) / 10]));
  if (withRetention) {
    const c = await report({ dimensions: "elapsedVideoTimeRatio", metrics: "audienceWatchRatio,relativeRetentionPerformance", filters: `video==${r.video}` });
    r.retention = c.map((x) => [x.elapsedVideoTimeRatio, Math.round(x.audienceWatchRatio * 1000) / 1000]);
    let drop = { at: null, d: 0 };
    for (let i = 1; i < r.retention.length; i++) {
      const d = r.retention[i - 1][1] - r.retention[i][1];
      if (d > drop.d) drop = { at: r.retention[i][0], d };
    }
    r.biggestDropAtRatio = drop.at; // kalikan dengan durasi video untuk detik
  }
}
fs.mkdirSync("docs/performance", { recursive: true });
fs.writeFileSync("docs/performance/analytics-latest.json", JSON.stringify({ fetchedAt: new Date().toISOString(), rows }, null, 2) + "\n");
console.log("video        views  engaged  avgDur  avg%   subs  shortsFeed%");
for (const r of rows) {
  console.log(
    `${r.video}  ${String(r.views).padStart(6)}  ${String(r.engagedViews ?? "-").padStart(7)}  ${String(Math.round(r.averageViewDuration)).padStart(5)}s  ${String(r.averageViewPercentage?.toFixed?.(1) ?? "-").padStart(5)}  ${String(r.subscribersGained).padStart(4)}  ${String(r.traffic?.SHORTS ?? "-").padStart(6)}`,
  );
}
console.log(`tersimpan: docs/performance/analytics-latest.json (${rows.length} video)`);

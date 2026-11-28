// Usage: node --env-file=.env scripts/yt-sync.mjs [--public-only] [--backup] [--quiet]
// Sinkronisasi INKREMENTAL semua data YouTube channel ke data/youtube.db (skema: docs/DATA.md). Aman dijalankan kapan saja
// dan berkali-kali; dipanggil di tahap 0 /create-short-video dan /create-long-video, serta /analyze-video.
//  1. Publik (YOUTUBE_API_KEY): statistik channel, semua video (judul, tayang, durasi), snapshot views/like/komentar
//     (hanya disimpan bila berubah), komentar baru (hanya video yang jumlah komentarnya berubah; tanpa nama/ID penulis).
//  2. Privat (OAuth read-only, scripts/yt-oauth.mjs): metrik harian per video, sumber trafik harian, metrik harian channel,
//     kurva retensi per jendela (d3/d7/d28) setelah jendelanya lengkap, istilah pencarian teratas. Diminta per kelompok
//     video (bukan per video) dan hanya rentang tanggal yang belum ada (3 hari terakhir diambil ulang karena data
//     Analytics masih bisa berubah). Video tua diperbarui lebih jarang (umur <=35 hari: tiap sinkron; <=400: mingguan; lainnya: bulanan).
//  3. Melengkapi youtubeId/uploadedAt/uploadSlot di docs/production-log.jsonl bila judulnya cocok persis.
// Gagal OAuth (mis. invalid_grant) tidak menggagalkan bagian publik; pesannya dicetak. Nilai .env tidak pernah dicetak.
import fs from "node:fs";
import { openDb, tx, getState, setState, ptDate, wibDate, addDays, daysBetween, readLog, writeLog, BACKUP_DIR } from "./lib/ytdb.mjs";

const CHANNEL_ID = "UCiM2lNuiMKrpqH4o4lKsGkg"; // @algobyte.explore
const args = new Set(process.argv.slice(2));
const publicOnly = args.has("--public-only");
const quiet = args.has("--quiet");
const now = new Date();
const nowIso = now.toISOString();
const todayPt = ptDate(now);
const db = openDb();
const out = [];

// ---------- 1. Publik ----------
const key = process.env.YOUTUBE_API_KEY;
if (!key) throw new Error("YOUTUBE_API_KEY tidak ada di environment");
const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) url.searchParams.set(k, String(v));
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (res.status === 403 && path === "commentThreads") return { items: [] }; // komentar nonaktif
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200).replaceAll(key, "***")}`);
  return res.json();
};

const ch = (await api("channels", { part: "statistics,contentDetails", id: CHANNEL_ID })).items?.[0];
if (!ch) throw new Error("Channel tidak ditemukan");
const prevCh = db.prepare("SELECT * FROM channel_snapshots ORDER BY ts DESC LIMIT 1").get();
const subs = +ch.statistics.subscriberCount;
db.prepare("INSERT INTO channel_snapshots VALUES (?, ?, ?, ?)").run(nowIso, subs, +ch.statistics.viewCount, +ch.statistics.videoCount);

const ids = [];
let pageToken;
do {
  const r = await api("playlistItems", { part: "contentDetails", playlistId: ch.contentDetails.relatedPlaylists.uploads, maxResults: 50, ...(pageToken ? { pageToken } : {}) });
  ids.push(...(r.items ?? []).map((i) => i.contentDetails.videoId));
  pageToken = r.nextPageToken;
} while (pageToken);

const log = readLog();
const logByYt = new Map(log.filter((l) => l.youtubeId).map((l) => [l.youtubeId, l]));
const isoDur = (iso) => {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
};
const known = new Set(db.prepare("SELECT video_id FROM videos").all().map((r) => r.video_id));
const lastSnap = db.prepare("SELECT views, likes, comments FROM public_snapshots WHERE video_id = ? ORDER BY ts DESC LIMIT 1");
const upVideo = db.prepare(`INSERT INTO videos (video_id, title, published_at, published_pt, duration_sec, format, first_seen, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(video_id) DO UPDATE SET title = excluded.title, published_at = excluded.published_at,
  published_pt = excluded.published_pt, duration_sec = excluded.duration_sec, format = excluded.format, updated_at = excluded.updated_at`);
const insSnap = db.prepare("INSERT OR IGNORE INTO public_snapshots VALUES (?, ?, ?, ?, ?)");
const publicVids = [];
for (let i = 0; i < ids.length; i += 50) {
  const r = await api("videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") });
  publicVids.push(...(r.items ?? []));
}
let newVideos = 0;
let snaps = 0;
tx(db, () => {
  for (const v of publicVids) {
    const dur = isoDur(v.contentDetails.duration);
    const format = logByYt.get(v.id)?.format ?? (dur <= 180 ? "short" : "long");
    if (!known.has(v.id)) newVideos++;
    upVideo.run(v.id, v.snippet.title, v.snippet.publishedAt, ptDate(v.snippet.publishedAt), dur, format, nowIso, nowIso);
    const s = { views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0 };
    const p = lastSnap.get(v.id);
    if (!p || p.views !== s.views || p.likes !== s.likes || p.comments !== s.comments) {
      insSnap.run(v.id, nowIso, s.views, s.likes, s.comments);
      snaps++;
    }
  }
});
out.push(
  `sinkron ${wibDate(now)} ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(now)} WIB | subscriber ${subs}` +
    (prevCh ? ` (${subs - prevCh.subs >= 0 ? "+" : ""}${subs - prevCh.subs} sejak ${wibDate(prevCh.ts)})` : "") +
    ` | ${publicVids.length} video publik (${newVideos} baru) | snapshot berubah: ${snaps}`,
);

// Komentar: hanya video yang jumlah komentarnya berubah sejak sinkron komentar terakhir.
const knownComment = db.prepare("SELECT 1 FROM comments WHERE comment_id = ?");
const upComment = db.prepare(`INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(comment_id) DO UPDATE SET
  likes = excluded.likes, replies = excluded.replies, text = excluded.text, fetched_at = excluded.fetched_at`);
let newComments = 0;
const commentVideos = new Set();
for (const v of publicVids) {
  const count = +v.statistics.commentCount || 0;
  const synced = db.prepare("SELECT comments_synced_count c FROM videos WHERE video_id = ?").get(v.id)?.c;
  if (synced === count) continue;
  let token;
  let stop = false;
  do {
    const r = await api("commentThreads", { part: "snippet", videoId: v.id, maxResults: 100, order: "time", textFormat: "plainText", ...(token ? { pageToken: token } : {}) });
    tx(db, () => {
      for (const t of r.items ?? []) {
        const c = t.snippet.topLevelComment.snippet;
        if (knownComment.get(t.id)) stop = true;
        else {
          newComments++;
          commentVideos.add(v.id);
        }
        upComment.run(t.id, v.id, c.publishedAt, c.likeCount, t.snippet.totalReplyCount, c.textDisplay.replace(/\s+/g, " ").trim(), nowIso);
      }
    });
    token = r.nextPageToken;
  } while (token && !stop);
  db.prepare("UPDATE videos SET comments_synced_count = ? WHERE video_id = ?").run(count, v.id);
}
out.push(`komentar: ${newComments} baru (${commentVideos.size} video)`);

// ---------- 2. Privat (YouTube Analytics) ----------
async function syncPrivate() {
  const { YT_OAUTH_CLIENT_ID: id, YT_OAUTH_CLIENT_SECRET: secret, YT_OAUTH_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) return "analytics: DILEWATI (OAuth belum disiapkan: scripts/yt-oauth.mjs)";
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const tj = await tok.json();
  if (!tok.ok) {
    return `analytics: DILEWATI (token gagal: ${tj.error}${tj.error === "invalid_grant" ? "; token kedaluwarsa, minta user: ! node --env-file=.env scripts/yt-oauth.mjs" : ""})`;
  }
  const H = { authorization: `Bearer ${tj.access_token}` };
  const report = async (params) => {
    const u = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    for (const [k, v] of Object.entries({ ids: "channel==MINE", endDate: todayPt, ...params })) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(60000) });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(`Analytics ${r.status}: ${j.error?.message ?? ""}`), { status: r.status });
    const cols = j.columnHeaders.map((c) => c.name);
    return (j.rows ?? []).map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));
  };

  const vids = db.prepare("SELECT video_id, published_pt, format, private_synced_at FROM videos").all();
  if (!vids.length) return "analytics: belum ada video";
  const firstPt = vids.map((v) => v.published_pt).sort()[0];

  // Channel harian
  const chLast = db.prepare("SELECT max(date) d FROM channel_daily").get().d;
  const chRows = await report({ dimensions: "day", metrics: "views,estimatedMinutesWatched,subscribersGained,subscribersLost", startDate: chLast ? addDays(chLast, -3) : firstPt });
  const upCh = db.prepare("INSERT OR REPLACE INTO channel_daily VALUES (?, ?, ?, ?, ?)");
  tx(db, () => chRows.forEach((r) => upCh.run(r.day, r.views, r.estimatedMinutesWatched, r.subscribersGained, r.subscribersLost)));
  const latest = db.prepare("SELECT max(date) d FROM channel_daily").get().d;

  // Video yang perlu diperbarui
  const sinceDays = (iso) => (iso ? (now - Date.parse(iso)) / 864e5 : Infinity);
  const due = vids.filter((v) => {
    const age = daysBetween(v.published_pt, todayPt);
    const s = sinceDays(v.private_synced_at);
    return s === Infinity || age <= 35 || (age <= 400 && s >= 7) || s >= 30;
  });
  const lastDay = db.prepare("SELECT max(date) d FROM video_daily WHERE video_id = ?");
  const start = new Map(due.map((v) => {
    const d = lastDay.get(v.video_id).d;
    return [v.video_id, d ? addDays(d, -3) : v.published_pt];
  }));
  due.sort((a, b) => start.get(a.video_id).localeCompare(start.get(b.video_id)));

  let engagedOk = getState(db, "engagedViews") !== "unsupported";
  const upDaily = db.prepare("INSERT OR REPLACE INTO video_daily VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const upTraffic = db.prepare("INSERT OR REPLACE INTO traffic_daily VALUES (?, ?, ?, ?)");
  const BASE = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost";
  let dailyRows = 0;
  for (let i = 0; i < due.length; i += 10) {
    const chunk = due.slice(i, i + 10);
    const filters = `video==${chunk.map((v) => v.video_id).join(",")}`;
    const startDate = start.get(chunk[0].video_id);
    let rows;
    try {
      rows = await report({ dimensions: "day,video", metrics: engagedOk ? `${BASE},engagedViews` : BASE, filters, startDate });
    } catch (e) {
      if (!engagedOk || e.status !== 400) throw e;
      engagedOk = false;
      setState(db, "engagedViews", "unsupported");
      rows = await report({ dimensions: "day,video", metrics: BASE, filters, startDate });
    }
    const traffic = await report({ dimensions: "day,insightTrafficSourceType,video", metrics: "views", filters, startDate });
    tx(db, () => {
      for (const r of rows) {
        if (r.day < start.get(r.video)) continue;
        upDaily.run(r.video, r.day, r.views, r.engagedViews ?? null, r.estimatedMinutesWatched, r.averageViewDuration, r.averageViewPercentage, r.likes, r.comments, r.shares, r.subscribersGained, r.subscribersLost);
        dailyRows++;
      }
      for (const r of traffic) if (r.day >= start.get(r.video)) upTraffic.run(r.video, r.day, r.insightTrafficSourceType, r.views);
    });
  }

  // Retensi per jendela, setelah jendelanya lengkap di data Analytics
  const WIN = { short: { d3: 3, d28: 28 }, long: { d7: 7, d28: 28 } };
  const hasRet = db.prepare("SELECT 1 FROM retention WHERE video_id = ? AND win = ? LIMIT 1");
  const insRet = db.prepare("INSERT OR REPLACE INTO retention VALUES (?, ?, ?, ?, ?, ?)");
  let retFetched = 0;
  for (const v of vids) {
    for (const [win, n] of Object.entries(WIN[v.format] ?? WIN.short)) {
      const end = addDays(v.published_pt, n - 1);
      if (!latest || end > latest || hasRet.get(v.video_id, win) || getState(db, `ret-empty:${v.video_id}:${win}`)) continue;
      const rows = await report({ dimensions: "elapsedVideoTimeRatio", metrics: "audienceWatchRatio,relativeRetentionPerformance", filters: `video==${v.video_id}`, startDate: v.published_pt, endDate: end });
      if (!rows.length) {
        setState(db, `ret-empty:${v.video_id}:${win}`, nowIso);
        continue;
      }
      tx(db, () => rows.forEach((r) => insRet.run(v.video_id, win, r.elapsedVideoTimeRatio, r.audienceWatchRatio, r.relativeRetentionPerformance, nowIso)));
      retFetched++;
    }
  }

  // Istilah pencarian teratas (seumur video), untuk video yang sedang diperbarui
  const delTerms = db.prepare("DELETE FROM search_terms WHERE video_id = ?");
  const insTerm = db.prepare("INSERT INTO search_terms VALUES (?, ?, ?, ?)");
  for (const v of due) {
    const rows = await report({ dimensions: "insightTrafficSourceDetail", metrics: "views", filters: `video==${v.video_id};insightTrafficSourceType==YT_SEARCH`, startDate: v.published_pt, maxResults: "25", sort: "-views" });
    tx(db, () => {
      delTerms.run(v.video_id);
      rows.forEach((r) => insTerm.run(v.video_id, r.insightTrafficSourceDetail, r.views, nowIso));
    });
  }

  const mark = db.prepare("UPDATE videos SET private_synced_at = ? WHERE video_id = ?");
  tx(db, () => due.forEach((v) => mark.run(nowIso, v.video_id)));
  const lag = latest ? daysBetween(latest, todayPt) : null;
  return `analytics: ${due.length} video diperbarui (${dailyRows} baris harian), data s.d. ${latest} (tertinggal ${lag} hari) | retensi baru: ${retFetched} | engagedViews: ${engagedOk ? "ada" : "tidak didukung"}`;
}
if (publicOnly) out.push("analytics: dilewati (--public-only)");
else {
  try {
    out.push(await syncPrivate());
  } catch (e) {
    out.push(`analytics: GAGAL (${e.message}); data publik tetap tersimpan`);
  }
}

// ---------- 3. Lengkapi production-log ----------
const norm = (s) => s?.toLowerCase().replace(/\s+/g, " ").trim();
const byTitle = new Map();
for (const v of db.prepare("SELECT video_id, title, published_at FROM videos").all()) {
  const k = norm(v.title);
  byTitle.set(k, byTitle.has(k) ? null : v); // null = judul ganda, jangan dicocokkan
}
const pub = new Map(db.prepare("SELECT video_id, published_at FROM videos").all().map((v) => [v.video_id, v.published_at]));
const filled = [];
for (const l of log) {
  if (!l.youtubeId) {
    const m = byTitle.get(norm(l.title));
    if (m) {
      l.youtubeId = m.video_id;
      filled.push(`${l.no} youtubeId`);
    }
  }
  const p = l.youtubeId && pub.get(l.youtubeId);
  if (!p) continue;
  if (!l.uploadedAt) {
    l.uploadedAt = wibDate(p);
    filled.push(`${l.no} uploadedAt`);
  }
  if ("uploadSlot" in l && !l.uploadSlot) {
    l.uploadSlot = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(p));
    filled.push(`${l.no} uploadSlot`);
  }
}
if (filled.length) writeLog(log);
out.push(`production-log: ${filled.length ? `diisi ${filled.join(", ")}` : "tidak ada yang perlu diisi"}`);
const unmatched = log.filter((l) => !l.youtubeId).map((l) => l.no);
if (unmatched.length) out.push(`  belum terlihat di API (terjadwal/privat/judul beda): ${unmatched.join(", ")}`);

setState(db, "last_sync", nowIso);

// ---------- Cadangan ke D: ----------
if (args.has("--backup")) {
  if (fs.existsSync("/mnt/d/Hamdan/Contents/algobyte-explore")) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const tmp = `${BACKUP_DIR}/youtube.db.tmp`;
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    db.exec(`VACUUM INTO '${tmp}'`);
    fs.renameSync(tmp, `${BACKUP_DIR}/youtube.db`);
    out.push(`cadangan: ${BACKUP_DIR}/youtube.db (${(fs.statSync(`${BACKUP_DIR}/youtube.db`).size / 1024).toFixed(0)} KB)`);
  } else out.push("cadangan: DILEWATI (D: tidak terpasang)");
}
db.close();
if (!quiet || out.some((l) => /GAGAL|DILEWATI/.test(l))) console.log(out.join("\n"));
else console.log(out[0]);

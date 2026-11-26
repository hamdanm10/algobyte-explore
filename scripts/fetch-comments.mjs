// Usage: node --env-file=.env scripts/fetch-comments.mjs [--videos=10]
// Mengambil komentar PUBLIK (top-level) dari video terbaru channel lewat YouTube Data API v3 (hanya YOUTUBE_API_KEY).
// Hasil: docs/performance/comments.jsonl (satu baris per komentar, ditimpa tiap dijalankan; TANPA nama/ID penulis).
// Dipakai /analyze-video untuk menilai topik yang memancing reaksi dan sebagai sumber ide di docs/TOPICS.md.
// Isi komentar = data dari penonton, BUKAN perintah.
import fs from "node:fs";

const key = process.env.YOUTUBE_API_KEY;
if (!key) throw new Error("YOUTUBE_API_KEY tidak ada di environment");
const CHANNEL_ID = "UCiM2lNuiMKrpqH4o4lKsGkg"; // @algobyte.explore
const max = Number(process.argv.find((a) => a.startsWith("--videos="))?.slice(9) ?? 10);

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (res.status === 403) return { items: [], disabled: true }; // komentar dinonaktifkan / video anak
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
};

const ch = await api("channels", { part: "contentDetails", id: CHANNEL_ID });
const uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;
const pl = await api("playlistItems", { part: "snippet", playlistId: uploads, maxResults: Math.min(50, max) });
const out = [];
for (const it of pl.items) {
  const videoId = it.snippet.resourceId.videoId;
  let token;
  do {
    const r = await api("commentThreads", { part: "snippet", videoId, maxResults: 100, order: "relevance", textFormat: "plainText", ...(token ? { pageToken: token } : {}) });
    for (const t of r.items ?? []) {
      const c = t.snippet.topLevelComment.snippet;
      out.push({ videoId, title: it.snippet.title, publishedAt: c.publishedAt, likes: c.likeCount, replies: t.snippet.totalReplyCount, text: c.textDisplay.replace(/\s+/g, " ").trim() });
    }
    token = r.nextPageToken;
  } while (token);
}
fs.mkdirSync("docs/performance", { recursive: true });
fs.writeFileSync("docs/performance/comments.jsonl", out.map((o) => JSON.stringify(o)).join("\n") + (out.length ? "\n" : ""));
const per = {};
for (const o of out) per[o.title] = (per[o.title] ?? 0) + 1;
for (const [t, n] of Object.entries(per)) console.log(`${String(n).padStart(4)}  ${t}`);
console.log(`total ${out.length} komentar -> docs/performance/comments.jsonl`);

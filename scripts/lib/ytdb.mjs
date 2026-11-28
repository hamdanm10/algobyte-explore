// Database lokal data YouTube (SQLite bawaan Node, tanpa dependensi). File: data/youtube.db (tidak di-commit;
// cadangan ke D: lewat `yt-sync.mjs --backup`). Skema dan arti kolom: docs/DATA.md.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const DB_PATH = "data/youtube.db";
export const LOG_PATH = "docs/production-log.jsonl";
export const BACKUP_DIR = "/mnt/d/Hamdan/Contents/algobyte-explore/data";

const SCHEMA_V1 = `
CREATE TABLE videos (
  video_id TEXT PRIMARY KEY, title TEXT, published_at TEXT, published_pt TEXT, duration_sec INTEGER,
  format TEXT, first_seen TEXT, updated_at TEXT,
  comments_synced_count INTEGER, private_synced_at TEXT
);
CREATE TABLE public_snapshots (video_id TEXT, ts TEXT, views INTEGER, likes INTEGER, comments INTEGER, PRIMARY KEY (video_id, ts));
CREATE TABLE channel_snapshots (ts TEXT PRIMARY KEY, subs INTEGER, total_views INTEGER, video_count INTEGER);
CREATE TABLE channel_daily (date TEXT PRIMARY KEY, views INTEGER, minutes REAL, subs_gained INTEGER, subs_lost INTEGER);
CREATE TABLE video_daily (
  video_id TEXT, date TEXT, views INTEGER, engaged_views INTEGER, minutes REAL, avg_view_sec REAL, avg_view_pct REAL,
  likes INTEGER, comments INTEGER, shares INTEGER, subs_gained INTEGER, subs_lost INTEGER, PRIMARY KEY (video_id, date)
);
CREATE TABLE traffic_daily (video_id TEXT, date TEXT, source TEXT, views INTEGER, PRIMARY KEY (video_id, date, source));
CREATE TABLE retention (video_id TEXT, win TEXT, ratio REAL, watch_ratio REAL, relative_perf REAL, fetched_at TEXT, PRIMARY KEY (video_id, win, ratio));
CREATE TABLE search_terms (video_id TEXT, term TEXT, views INTEGER, fetched_at TEXT, PRIMARY KEY (video_id, term));
CREATE TABLE comments (comment_id TEXT PRIMARY KEY, video_id TEXT, published_at TEXT, likes INTEGER, replies INTEGER, text TEXT, fetched_at TEXT);
CREATE TABLE manual_metrics (video_id TEXT, metric TEXT, win TEXT, value REAL, source TEXT, entered_at TEXT, PRIMARY KEY (video_id, metric, win));
CREATE TABLE sync_state (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX idx_comments_video ON comments (video_id, published_at);
CREATE INDEX idx_snap_ts ON public_snapshots (ts);
`;

export function openDb(path = DB_PATH) {
  fs.mkdirSync("data", { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const v = db.prepare("PRAGMA user_version").get().user_version;
  if (v < 1) db.exec(`BEGIN; ${SCHEMA_V1} PRAGMA user_version = 1; COMMIT;`);
  return db;
}

export const tx = (db, fn) => {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
};

export const getState = (db, key) => db.prepare("SELECT value FROM sync_state WHERE key = ?").get(key)?.value ?? null;
export const setState = (db, key, value) =>
  db.prepare("INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));

// Tanggal hari di zona Pacific: YouTube Analytics menghitung "day" dalam waktu Pacific.
export const ptDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(d));
export const wibDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(d));
export const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

// Jendela metrik: dN = hari 0..N-1 sejak tanggal tayang (waktu Pacific). Lihat docs/DATA.md.
export const WINDOWS = { d1: 1, d3: 3, d7: 7, d28: 28, d90: 90, d365: 365 };

export function readLog(path = LOG_PATH) {
  if (!fs.existsSync(path)) return [];
  return fs.readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
export function writeLog(rows, path = LOG_PATH) {
  fs.writeFileSync(path, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

export const median = (xs) => {
  const a = xs.filter((x) => x != null && Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
export const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
export const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

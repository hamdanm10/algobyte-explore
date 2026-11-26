// Usage (sekali saja, atau saat token kedaluwarsa): node --env-file=.env scripts/yt-oauth.mjs
// Login OAuth READ-ONLY ke YouTube Analytics (scope yt-analytics.readonly). TIDAK ada izin upload/mengubah channel.
// Butuh di .env: YT_OAUTH_CLIENT_ID, YT_OAUTH_CLIENT_SECRET (OAuth Client ID tipe "Desktop app").
// Alur: membuka server lokal http://127.0.0.1:<port>, mencetak URL login; user membuka URL itu di browser Windows,
// login dengan akun pemilik channel, lalu Google mengarahkan kembali ke server lokal ini.
// Refresh token disimpan ke .env sebagai YT_OAUTH_REFRESH_TOKEN (nilainya tidak pernah dicetak).
import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";

const id = process.env.YT_OAUTH_CLIENT_ID;
const secret = process.env.YT_OAUTH_CLIENT_SECRET;
if (!id || !secret) throw new Error("YT_OAUTH_CLIENT_ID / YT_OAUTH_CLIENT_SECRET belum ada di .env");
const SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
const PORT = 8765;
const redirect = `http://127.0.0.1:${PORT}`;
const verifier = crypto.randomBytes(48).toString("base64url");
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
const state = crypto.randomBytes(16).toString("hex");

const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
for (const [k, v] of Object.entries({
  client_id: id, redirect_uri: redirect, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent",
  code_challenge: challenge, code_challenge_method: "S256", state,
})) auth.searchParams.set(k, v);

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  if (!u.searchParams.has("code") && !u.searchParams.has("error")) { res.writeHead(404).end(); return; }
  const done = (msg) => { res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end(msg); server.close(); };
  if (u.searchParams.get("state") !== state) return done("State tidak cocok. Jalankan ulang skrip.");
  if (u.searchParams.get("error")) { done(`Ditolak: ${u.searchParams.get("error")}`); console.error("Login ditolak:", u.searchParams.get("error")); return; }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: u.searchParams.get("code"), client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier }),
  });
  const j = await r.json();
  if (!r.ok || !j.refresh_token) { done("Gagal menukar kode. Lihat terminal."); console.error("Gagal:", j.error, j.error_description ?? ""); return; }
  const env = fs.readFileSync(".env", "utf8");
  const line = `YT_OAUTH_REFRESH_TOKEN=${j.refresh_token}`;
  fs.writeFileSync(".env", /^YT_OAUTH_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^YT_OAUTH_REFRESH_TOKEN=.*$/m, line) : env.replace(/\n?$/, "\n") + line + "\n");
  done("Berhasil. Tab ini boleh ditutup.");
  console.log(`Berhasil: refresh token disimpan ke .env (scope: ${j.scope}).`);
});
server.listen(PORT, "127.0.0.1", () => {
  console.log("Buka URL ini di browser (Windows), login dengan akun pemilik channel Algobyte Explore:\n");
  console.log(auth.toString());
  console.log(`\nMenunggu login di ${redirect} ...`);
});

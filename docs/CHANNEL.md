# Konteks channel (dibaca saat pakai skill `youtube` atau merencanakan video)

Skill `youtube` mewajibkan tiga input; jawabannya sudah ada di sini, jangan tanya ulang ke user:
- **Niche:** map animation / edukasi visual berbasis data Indonesia (geografi, penduduk, ekonomi, sejarah), format Shorts, bahasa Indonesia.
- **Tier ukuran:** New (di bawah 1K subscriber). 99 subscriber per 2026-11-25.
- **Tujuan utama:** Growth (monetisasi masih jauh).
- **Channel:** https://www.youtube.com/@algobyte.explore (ID: UCiM2lNuiMKrpqH4o4lKsGkg), dibuat 2025-09-27, negara ID.
- Tagline: "Map Animation • Edukasi Visual".

## Data per 2026-11-25 (dari YouTube Data API)
Total 22.576 views, 2 video lama (dibuat manual sebelum project ini), tidak ada upload baru sekitar 13 bulan.

| Video | Tayang | Durasi | Views | Like | Komentar |
|---|---|---|---|---|---|
| Ternyata Segini Jumlah Penduduk Tiap Pulau di Indonesia! | 2025-09-27 | 1:18 | 19.224 | 471 | 32 |
| 5 Kota dengan UMK Tertinggi di Indonesia! | 2025-10-19 | 0:53 | 3.354 | 91 | 8 |

Pola: data Indonesia yang relatable divisualkan di peta. Deskripsi video lama minim (satu kalimat + hashtag), SEO masih lemah.

## Syarat monetisasi (cek ulang di YouTube Studio, bisa berubah)
Kira-kira 500 subscriber + 3 upload publik dalam 90 hari + 3 juta views Shorts atau 3.000 jam tonton dalam 90 hari untuk tahap awal. Konsistensi upload adalah masalah terbesar saat ini.

## Cara mengambil data channel lagi
**Cara utama (tanpa Python):** `node --env-file=.env scripts/channel-stats.mjs` (tabel video, views per hari, perubahan sejak snapshot terakhir; snapshot disimpan di `docs/performance/snapshots.jsonl`). Dipakai oleh `/analyze-video`.
Cara lama lewat skrip Python skill `youtube` (butuh venv, hanya bila perlu fitur skill yang tidak ada di skrip di atas):
Butuh `YOUTUBE_API_KEY` di `.env` (sudah ada) dan paket Python `google-api-python-client` di venv:
```
python3 -m venv /tmp/yt-venv && /tmp/yt-venv/bin/pip install -q google-api-python-client google-auth-oauthlib
bash -c 'set -a; source .env; set +a; cd ~/.claude/skills/youtube && /tmp/yt-venv/bin/python execution/fetch_channel_data.py @algobyte.explore --videos 10'
```
Biaya kuota kecil (sekitar 4 dari 10.000 unit per hari). Analytics privat (retention, CTR) butuh OAuth, belum disiapkan; salin manual dari YouTube Studio bila perlu.
